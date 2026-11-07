CREATE TABLE public.jury_control (id boolean PRIMARY KEY DEFAULT true CHECK(id), used integer NOT NULL DEFAULT 0 CHECK(used BETWEEN 0 AND 10), oriane_reserved integer NOT NULL DEFAULT 0 CHECK(oriane_reserved BETWEEN 0 AND 500), openai_reserved numeric NOT NULL DEFAULT 0 CHECK(openai_reserved BETWEEN 0 AND 1), active_job uuid, lease_until timestamptz);
GRANT ALL ON public.jury_control TO service_role;
ALTER TABLE public.jury_control ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.jury_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token_hash text UNIQUE NOT NULL, credential_version text NOT NULL, csrf_hash text NOT NULL, expires_at timestamptz NOT NULL, revoked boolean NOT NULL DEFAULT false);
GRANT ALL ON public.jury_sessions TO service_role;
ALTER TABLE public.jury_sessions ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.jury_login_windows (bucket text PRIMARY KEY, attempts integer NOT NULL DEFAULT 0, expires_at timestamptz NOT NULL);
GRANT ALL ON public.jury_login_windows TO service_role;
ALTER TABLE public.jury_login_windows ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.jury_jobs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES public.jury_sessions(id), idempotency_key uuid NOT NULL, cache_key text UNIQUE NOT NULL, query jsonb NOT NULL, status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','completed','failed','cancelled')), stage text NOT NULL DEFAULT 'search', completed_stages jsonb NOT NULL DEFAULT '[]', result jsonb, error_code text, cancel_requested boolean NOT NULL DEFAULT false, deadline timestamptz NOT NULL, run_token uuid, UNIQUE(session_id,idempotency_key));
GRANT ALL ON public.jury_jobs TO service_role;
ALTER TABLE public.jury_jobs ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.jury_job_access (session_id uuid NOT NULL REFERENCES public.jury_sessions(id), idempotency_key uuid NOT NULL, job_id uuid NOT NULL REFERENCES public.jury_jobs(id), cached boolean NOT NULL DEFAULT false, PRIMARY KEY(session_id,idempotency_key));
GRANT ALL ON public.jury_job_access TO service_role;
ALTER TABLE public.jury_job_access ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.jury_backend(p_action text, p_args jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c public.jury_control; s public.jury_sessions; j public.jury_jobs; cached_value boolean := false; bucket_value text; n integer; next_stage text; stage_index integer; stages text[] := ARRAY['search','retrieve','extract','group','verify','ready'];
BEGIN
 INSERT INTO public.jury_control(id) VALUES(true) ON CONFLICT DO NOTHING;
 SELECT * INTO c FROM public.jury_control WHERE id=true FOR UPDATE;
 -- The global row serializes every admission, limiter and job transition.
 IF c.active_job IS NOT NULL AND c.lease_until <= clock_timestamp() THEN
   UPDATE public.jury_jobs SET status='failed',error_code='execution_timeout' WHERE id=c.active_job AND status IN ('queued','running');
   UPDATE public.jury_control SET active_job=NULL,lease_until=NULL WHERE id=true;
   c.active_job := NULL;
 END IF;
 IF p_action='health' THEN RETURN jsonb_build_object('healthy',true); END IF;
 IF p_action='login_limit' THEN
   bucket_value := 'global:' || floor(extract(epoch FROM clock_timestamp())/60)::text;
   INSERT INTO public.jury_login_windows(bucket,attempts,expires_at) VALUES(bucket_value,1,clock_timestamp()+interval '1 minute') ON CONFLICT(bucket) DO UPDATE SET attempts=jury_login_windows.attempts+1 RETURNING attempts INTO n;
   IF n>20 THEN RETURN jsonb_build_object('error','login_limited','status',429); END IF;
   -- No forwarded IP is trusted: the global limiter is mandatory and authoritative.
   RETURN jsonb_build_object('allowed',true);
 END IF;
 IF p_action='login' THEN
   IF length(p_args->>'token_hash')<>64 OR length(p_args->>'credential_version')<>64 OR length(p_args->>'csrf_hash')<>64 THEN RETURN jsonb_build_object('error','invalid_request','status',400); END IF;
   INSERT INTO public.jury_sessions(token_hash,credential_version,csrf_hash,expires_at) VALUES(p_args->>'token_hash',p_args->>'credential_version',p_args->>'csrf_hash',clock_timestamp()+interval '45 minutes') RETURNING * INTO s;
 ELSE
   SELECT * INTO s FROM public.jury_sessions WHERE token_hash=p_args->>'token_hash' AND credential_version=p_args->>'credential_version' AND NOT revoked AND expires_at>clock_timestamp();
   IF NOT FOUND THEN RETURN jsonb_build_object('error','unauthenticated','status',401); END IF;
 END IF;
 IF p_action IN ('logout','reserve','claim','cancel','stage','finish') AND s.csrf_hash IS DISTINCT FROM p_args->>'csrf_hash' THEN RETURN jsonb_build_object('error','csrf_rejected','status',403); END IF;
 IF p_action IN ('session','login') THEN
   RETURN jsonb_build_object('authenticated',true,'remaining',10-c.used,'activeJobId',(SELECT id FROM public.jury_jobs WHERE id=c.active_job AND (session_id=s.id OR EXISTS(SELECT 1 FROM public.jury_job_access a WHERE a.job_id=c.active_job AND a.session_id=s.id))));
 END IF;
 IF p_action='logout' THEN UPDATE public.jury_sessions SET revoked=true WHERE id=s.id; RETURN '{}'; END IF;
 IF p_action='reserve' THEN
   SELECT q.* , a.cached INTO j FROM public.jury_jobs q JOIN public.jury_job_access a ON a.job_id=q.id WHERE a.session_id=s.id AND a.idempotency_key=(p_args->>'idempotency_key')::uuid;
   IF j.id IS NULL THEN
     SELECT * INTO j FROM public.jury_jobs WHERE cache_key=p_args->>'cache_key';
     IF j.id IS NOT NULL THEN
       IF j.status<>'completed' AND j.session_id<>s.id THEN RETURN jsonb_build_object('error','query_unavailable','status',409); END IF;
       cached_value := j.status='completed';
     ELSE
       IF c.active_job IS NOT NULL THEN RETURN jsonb_build_object('error','busy','status',409); END IF;
       IF c.used>=10 OR c.oriane_reserved+50>500 OR c.openai_reserved+0.10>1 THEN RETURN jsonb_build_object('error','quota_exhausted','status',429); END IF;
       INSERT INTO public.jury_jobs(session_id,idempotency_key,cache_key,query,deadline) VALUES(s.id,(p_args->>'idempotency_key')::uuid,p_args->>'cache_key',p_args->'query',clock_timestamp()+interval '120 seconds') RETURNING * INTO j;
       UPDATE public.jury_control SET used=used+1,oriane_reserved=oriane_reserved+50,openai_reserved=openai_reserved+0.10,active_job=j.id,lease_until=j.deadline WHERE id=true RETURNING * INTO c;
     END IF;
     INSERT INTO public.jury_job_access VALUES(s.id,(p_args->>'idempotency_key')::uuid,j.id,cached_value);
   ELSE
     SELECT a.cached INTO cached_value FROM public.jury_job_access a WHERE a.session_id=s.id AND a.idempotency_key=(p_args->>'idempotency_key')::uuid;
     IF j.cache_key IS DISTINCT FROM p_args->>'cache_key' THEN RETURN jsonb_build_object('error','idempotency_conflict','status',409); END IF;
   END IF;
 ELSE
   SELECT * INTO j FROM public.jury_jobs WHERE id=(p_args->>'job_id')::uuid AND (session_id=s.id OR EXISTS(SELECT 1 FROM public.jury_job_access a WHERE a.session_id=s.id AND a.job_id=jury_jobs.id));
   IF NOT FOUND THEN RETURN jsonb_build_object('error','not_found','status',404); END IF;
   SELECT COALESCE(bool_or(a.cached),false) INTO cached_value FROM public.jury_job_access a WHERE a.session_id=s.id AND a.job_id=j.id;
   IF p_action='claim' THEN
     IF j.status<>'queued' OR j.cancel_requested OR c.active_job IS DISTINCT FROM j.id OR c.lease_until<=clock_timestamp() THEN RETURN jsonb_build_object('error','not_runnable','status',409); END IF;
     UPDATE public.jury_jobs SET status='running',run_token=gen_random_uuid(),deadline=clock_timestamp()+interval '55 seconds' WHERE id=j.id RETURNING * INTO j;
   ELSIF p_action='cancel' THEN
     UPDATE public.jury_jobs SET cancel_requested=true WHERE id=j.id RETURNING * INTO j;
     IF j.status='queued' THEN
       UPDATE public.jury_jobs SET status='cancelled',error_code='cancelled' WHERE id=j.id RETURNING * INTO j;
       UPDATE public.jury_control SET active_job=NULL,lease_until=NULL WHERE id=true AND active_job=j.id;
     END IF;
   ELSIF p_action IN ('stage','finish') THEN
     IF j.session_id<>s.id OR j.status<>'running' OR j.run_token IS DISTINCT FROM (p_args->>'run_token')::uuid OR c.active_job IS DISTINCT FROM j.id THEN RETURN jsonb_build_object('error','stale_execution','status',409); END IF;
     IF p_action='stage' THEN
       IF j.cancel_requested THEN RETURN jsonb_build_object('error','cancelled','status',409); END IF;
       IF j.deadline<=clock_timestamp() THEN RETURN jsonb_build_object('error','execution_timeout','status',409); END IF;
       next_stage := p_args->>'stage';
       stage_index := array_position(stages,j.stage);
       IF next_stage IS DISTINCT FROM stages[stage_index+1] THEN RETURN jsonb_build_object('error','invalid_stage','status',409); END IF;
       UPDATE public.jury_jobs SET completed_stages=completed_stages || to_jsonb(stage),stage=next_stage WHERE id=j.id RETURNING * INTO j;
     ELSE
       IF p_args->>'outcome'='completed' AND (j.stage<>'ready' OR j.deadline<=clock_timestamp() OR j.cancel_requested) THEN RETURN jsonb_build_object('error','invalid_completion','status',409); END IF;
       IF p_args->>'outcome' NOT IN ('completed','failed','cancelled') THEN RETURN jsonb_build_object('error','invalid_completion','status',409); END IF;
       UPDATE public.jury_jobs SET status=CASE WHEN cancel_requested THEN 'cancelled' ELSE p_args->>'outcome' END,result=CASE WHEN p_args->>'outcome'='completed' AND NOT cancel_requested THEN p_args->'result' ELSE NULL END,error_code=p_args->>'error_code',completed_stages=CASE WHEN p_args->>'outcome'='completed' AND NOT cancel_requested THEN completed_stages || '"ready"'::jsonb ELSE completed_stages END WHERE id=j.id RETURNING * INTO j;
       UPDATE public.jury_control SET active_job=NULL,lease_until=NULL WHERE id=true AND active_job=j.id;
     END IF;
   ELSIF p_action<>'get' THEN RETURN jsonb_build_object('error','invalid_action','status',400); END IF;
 END IF;
 RETURN jsonb_build_object('id',j.id,'status',j.status,'stage',j.stage,'completedStages',j.completed_stages,'cached',cached_value,'remaining',10-c.used,'result',j.result,'errorCode',j.error_code) || CASE WHEN p_action='claim' THEN jsonb_build_object('runToken',j.run_token,'query',j.query) ELSE '{}'::jsonb END;
END $$;
REVOKE ALL ON FUNCTION public.jury_backend(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.jury_backend(text,jsonb) TO service_role;
REVOKE ALL ON public.jury_control,public.jury_sessions,public.jury_login_windows,public.jury_jobs,public.jury_job_access FROM anon,authenticated;