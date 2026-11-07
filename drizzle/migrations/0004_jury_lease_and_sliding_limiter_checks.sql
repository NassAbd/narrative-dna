DO $$ DECLARE a jsonb; j jsonb; t text:=encode(gen_random_bytes(32),'hex'); i integer; job uuid; BEGIN BEGIN
PERFORM public.jury_backend('health');
UPDATE public.jury_control SET used=0,oriane_reserved=0,openai_reserved=0,active_job=NULL,lease_until=NULL WHERE id=true;
PERFORM public.jury_backend('login',jsonb_build_object('token_hash',t,'credential_version',t,'csrf_hash',t));
a:=jsonb_build_object('token_hash',t,'credential_version',t,'csrf_hash',t);
j:=public.jury_backend('reserve',a||jsonb_build_object('idempotency_key',gen_random_uuid(),'cache_key','lease-check-'||t,'query','{}'::jsonb)); job:=(j->>'id')::uuid;
UPDATE public.jury_control SET lease_until=clock_timestamp()-interval '1 second' WHERE id=true;
PERFORM public.jury_backend('health');
IF (SELECT status FROM public.jury_jobs WHERE id=job) IS DISTINCT FROM 'failed' OR (SELECT used FROM public.jury_control WHERE id=true)<>1 OR (SELECT active_job IS NOT NULL FROM public.jury_control WHERE id=true) THEN RAISE EXCEPTION 'lease expiry accounting failed'; END IF;
FOR i IN 1..21 LOOP j:=public.jury_backend('login_limit'); END LOOP;
IF j->>'error' IS DISTINCT FROM 'login_limited' THEN RAISE EXCEPTION 'sliding global limiter failed'; END IF;
PERFORM public.jury_backend('logout',a);
IF public.jury_backend('session',a)->>'error' IS DISTINCT FROM 'unauthenticated' THEN RAISE EXCEPTION 'logout revocation failed'; END IF;
RAISE EXCEPTION USING ERRCODE='J0001', MESSAGE='rollback verified checks';
EXCEPTION WHEN SQLSTATE 'J0001' THEN NULL; END; END $$;