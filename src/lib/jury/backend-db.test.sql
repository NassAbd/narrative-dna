-- Execute on a privileged test connection. All changes roll back; no provider calls.
BEGIN;
DO $$
DECLARE a jsonb; b jsonb; j jsonb; key1 uuid := gen_random_uuid(); job uuid; run uuid; token text := repeat('a',64); version text := repeat('b',64); csrf text := repeat('c',64);
BEGIN
 -- Ensure this transaction does not consume production accounting.
 PERFORM public.jury_backend('health');
 UPDATE public.jury_control SET used=0,oriane_reserved=0,openai_reserved=0,active_job=NULL,lease_until=NULL WHERE id=true;
 PERFORM public.jury_backend('login',jsonb_build_object('token_hash',token,'credential_version',version,'csrf_hash',csrf));
 a:=jsonb_build_object('token_hash',token,'credential_version',version,'csrf_hash',csrf);
 IF public.jury_backend('session',a||jsonb_build_object('credential_version',repeat('d',64)))->>'error'<>'unauthenticated' THEN RAISE EXCEPTION 'rotation failed'; END IF;
 IF public.jury_backend('reserve',a||jsonb_build_object('csrf_hash','bad'))->>'error'<>'csrf_rejected' THEN RAISE EXCEPTION 'csrf failed'; END IF;
 b:=a||jsonb_build_object('idempotency_key',key1,'cache_key','sql-test-'||key1,'query',jsonb_build_object('topic','test'));
 j:=public.jury_backend('reserve',b); job:=(j->>'id')::uuid;
 IF j->>'remaining'<>'9' THEN RAISE EXCEPTION 'reservation count failed'; END IF;
 IF public.jury_backend('reserve',b)->>'id'<>job::text THEN RAISE EXCEPTION 'idempotency failed'; END IF;
 IF public.jury_backend('reserve',a||jsonb_build_object('idempotency_key',gen_random_uuid(),'cache_key','other','query','{}'::jsonb))->>'error'<>'busy' THEN RAISE EXCEPTION 'concurrency failed'; END IF;
 j:=public.jury_backend('claim',a||jsonb_build_object('job_id',job)); run:=(j->>'runToken')::uuid;
 IF public.jury_backend('claim',a||jsonb_build_object('job_id',job))->>'error'<>'not_runnable' THEN RAISE EXCEPTION 'double claim failed'; END IF;
 PERFORM public.jury_backend('cancel',a||jsonb_build_object('job_id',job));
 IF (SELECT active_job IS NULL FROM public.jury_control WHERE id=true) THEN RAISE EXCEPTION 'active cancellation released lock'; END IF;
 PERFORM public.jury_backend('finish',a||jsonb_build_object('job_id',job,'run_token',run,'outcome','failed','error_code','test_failure'));
 IF (SELECT used FROM public.jury_control WHERE id=true)<>1 THEN RAISE EXCEPTION 'failure refunded'; END IF;
 IF public.jury_backend('reserve',b)->>'status'<>'cancelled' THEN RAISE EXCEPTION 'failed duplicate reran'; END IF;
 UPDATE public.jury_jobs SET status='completed',result='{"mode":"live"}' WHERE id=job;
 IF public.jury_backend('reserve',b||jsonb_build_object('idempotency_key',gen_random_uuid()))->>'cached'<>'true' THEN RAISE EXCEPTION 'cache failed'; END IF;
 IF (SELECT used FROM public.jury_control WHERE id=true)<>1 THEN RAISE EXCEPTION 'cache charged'; END IF;
 UPDATE public.jury_control SET used=10,oriane_reserved=500,openai_reserved=1 WHERE id=true;
 IF public.jury_backend('reserve',a||jsonb_build_object('idempotency_key',gen_random_uuid(),'cache_key','quota-test'))->>'error'<>'quota_exhausted' THEN RAISE EXCEPTION 'quota failed'; END IF;
 UPDATE public.jury_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash=token;
 IF public.jury_backend('session',a)->>'error'<>'unauthenticated' THEN RAISE EXCEPTION 'expiry failed'; END IF;
 IF has_function_privilege('anon','public.jury_backend(text,jsonb)','EXECUTE') OR has_function_privilege('authenticated','public.jury_backend(text,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'rpc permissions failed'; END IF;
END $$;
ROLLBACK;