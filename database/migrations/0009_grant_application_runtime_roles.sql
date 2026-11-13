DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'agent_application') THEN
    GRANT app_api, app_worker TO agent_application;
  END IF;
END
$$;
