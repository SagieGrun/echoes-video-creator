

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."award_share_credits"("target_user_id" "uuid", "credit_amount" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Update user's credit balance
  UPDATE users 
  SET credit_balance = credit_balance + credit_amount,
      updated_at = now()
  WHERE id = target_user_id;
  
  -- Log the credit transaction
  INSERT INTO credit_transactions (
    user_id,
    amount,
    type,
    reference_id
  ) VALUES (
    target_user_id,
    credit_amount,
    'share',
    'social_share_bonus'
  );
END;
$$;


ALTER FUNCTION "public"."award_share_credits"("target_user_id" "uuid", "credit_amount" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_admin_config_table"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- This function exists for API compatibility
  -- The table is already created by migration
  RETURN;
END;
$$;


ALTER FUNCTION "public"."create_admin_config_table"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_plg_settings"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  settings JSONB;
BEGIN
  SELECT value INTO settings 
  FROM public.admin_config 
  WHERE key = 'plg_settings';
  
  -- Return default values if not found
  IF settings IS NULL THEN
    RETURN '{"referral_reward_credits": 5, "share_reward_credits": 2}'::jsonb;
  END IF;
  
  RETURN settings;
END;
$$;


ALTER FUNCTION "public"."get_plg_settings"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_plg_settings"() IS 'Returns current PLG reward configuration from admin settings';



CREATE OR REPLACE FUNCTION "public"."get_referral_earnings"("user_uuid" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  total_earnings INTEGER;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total_earnings
  FROM public.credit_transactions
  WHERE user_id = user_uuid 
    AND type IN ('referral', 'referral_bonus');
  
  RETURN total_earnings;
END;
$$;


ALTER FUNCTION "public"."get_referral_earnings"("user_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_referral_earnings"("user_uuid" "uuid") IS 'Calculates total credits earned by user through referrals';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.users (id, email, referral_code)
  values (
    new.id,
    new.email,
    substr(md5(random()::text), 1, 8)
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_referral_signup"("new_user_id" "uuid", "referrer_code" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  referrer_user_id uuid;
BEGIN
  -- Only process if referrer_code is provided
  IF referrer_code IS NULL OR referrer_code = '' THEN
    RETURN '{"success": false, "reason": "no_referrer_code"}'::jsonb;
  END IF;

  -- Find the referrer by referral code
  SELECT id INTO referrer_user_id
  FROM users
  WHERE referral_code = referrer_code;
  
  -- If no referrer found, exit
  IF referrer_user_id IS NULL THEN
    RETURN '{"success": false, "reason": "invalid_referrer_code"}'::jsonb;
  END IF;
  
  -- Prevent self-referrals (ONLY anti-abuse check for MVP)
  IF referrer_user_id = new_user_id THEN
    RETURN '{"success": false, "reason": "self_referral_blocked"}'::jsonb;
  END IF;
  
  -- Create referral record (FIX: use referred_id not referred_user_id)
  INSERT INTO referrals (
    referrer_id,
    referred_id,
    reward_granted
  ) VALUES (
    referrer_user_id,
    new_user_id,
    false
  )
  ON CONFLICT (referrer_id, referred_id) DO NOTHING;
  
  RETURN '{"success": true, "reason": "referral_created"}'::jsonb;
END;
$$;


ALTER FUNCTION "public"."process_referral_signup"("new_user_id" "uuid", "referrer_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_share_for_reward"("target_user_id" "uuid", "screenshot_url" "text" DEFAULT 'https://echoes.video'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  existing_submission share_submissions%ROWTYPE;
  plg_share_reward integer;
BEGIN
  -- Check if user already has an approved share submission (ONLY anti-abuse check)
  SELECT * INTO existing_submission
  FROM share_submissions
  WHERE user_id = target_user_id AND status = 'approved'
  LIMIT 1;
  
  IF existing_submission.id IS NOT NULL THEN
    RETURN '{"success": false, "reason": "already_claimed"}'::jsonb;
  END IF;
  
  -- Get share reward amount from admin config
  SELECT value::integer INTO plg_share_reward
  FROM admin_config
  WHERE key = 'plg_share_reward';
  
  IF plg_share_reward IS NULL THEN
    plg_share_reward := 2; -- Default fallback
  END IF;
  
  -- Create share submission
  INSERT INTO share_submissions (
    user_id,
    screenshot_url,
    status
  ) VALUES (
    target_user_id,
    screenshot_url,
    'approved' -- Auto-approve for honor system
  );
  
  -- Award credits immediately
  UPDATE users 
  SET credit_balance = credit_balance + plg_share_reward
  WHERE id = target_user_id;
  
  -- Log the credit transaction
  INSERT INTO credit_transactions (
    user_id,
    amount,
    type,
    reference_id
  ) VALUES (
    target_user_id,
    plg_share_reward,
    'share',
    'social_share_bonus'
  );
  
  -- FIX: Use proper JSON construction to avoid syntax errors
  RETURN jsonb_build_object(
    'success', true,
    'reason', 'reward_granted',
    'credits_awarded', plg_share_reward
  );
END;
$$;


ALTER FUNCTION "public"."submit_share_for_reward"("target_user_id" "uuid", "screenshot_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_generated_videos_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_generated_videos_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_share_reward"("user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.share_submissions 
    WHERE user_id = user_uuid AND status = 'approved'
  );
END;
$$;


ALTER FUNCTION "public"."user_has_share_reward"("user_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_has_share_reward"("user_uuid" "uuid") IS 'Checks if user has already received their one-time share reward';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_config" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."admin_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clips" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "video_url" "text",
    "prompt" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "approved" boolean DEFAULT false,
    "clip_order" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "generation_job_id" "text",
    "regen_count" integer DEFAULT 0 NOT NULL,
    "image_file_path" "text",
    "video_file_path" "text",
    CONSTRAINT "clips_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."clips" OWNER TO "postgres";


COMMENT ON COLUMN "public"."clips"."video_url" IS 'Signed URL for video access (temporary)';



COMMENT ON COLUMN "public"."clips"."video_file_path" IS 'Permanent file path in storage bucket';



CREATE TABLE IF NOT EXISTS "public"."credit_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "type" "text" NOT NULL,
    "reference_id" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "credit_transactions_type_check" CHECK (("type" = ANY (ARRAY['purchase'::"text", 'referral'::"text", 'generation'::"text", 'share'::"text", 'referral_bonus'::"text"])))
);


ALTER TABLE "public"."credit_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."final_videos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "selected_clips" "jsonb" NOT NULL,
    "music_track_id" "uuid",
    "transition_type" character varying(20) DEFAULT 'fade'::character varying,
    "music_volume" double precision DEFAULT 0.7,
    "status" character varying(20) DEFAULT 'draft'::character varying,
    "file_url" "text",
    "file_path" "text",
    "total_duration" integer,
    "file_size" bigint,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "compilation_started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "error_message" "text",
    "public_url" "text",
    "output_aspect_ratio" character varying(10) DEFAULT '16:9'::character varying,
    CONSTRAINT "valid_status" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::"text"[]))),
    CONSTRAINT "valid_transition" CHECK ((("transition_type")::"text" = ANY ((ARRAY['fade'::character varying, 'cut'::character varying, 'dissolve'::character varying, 'slide'::character varying])::"text"[]))),
    CONSTRAINT "valid_volume" CHECK ((("music_volume" >= (0)::double precision) AND ("music_volume" <= (1)::double precision)))
);


ALTER TABLE "public"."final_videos" OWNER TO "postgres";


COMMENT ON COLUMN "public"."final_videos"."file_path" IS 'Internal file path in storage bucket';



COMMENT ON COLUMN "public"."final_videos"."public_url" IS 'Public URL for sharing and access';



COMMENT ON COLUMN "public"."final_videos"."output_aspect_ratio" IS 'Output aspect ratio of the final video (16:9, 9:16, 1:1)';



CREATE TABLE IF NOT EXISTS "public"."music_tracks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "file_url" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "duration" integer DEFAULT 60 NOT NULL,
    "file_size" bigint DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."music_tracks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount_cents" integer NOT NULL,
    "credits_purchased" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "gumroad_sale_id" "text",
    "gumroad_product_id" "text",
    "gumroad_product_permalink" "text",
    "gumroad_order_number" bigint,
    "buyer_email" "text",
    CONSTRAINT "payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'failed'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."payments"."gumroad_sale_id" IS 'Unique sale ID from Gumroad webhook';



COMMENT ON COLUMN "public"."payments"."gumroad_product_permalink" IS 'Product permalink used to determine credits';



COMMENT ON COLUMN "public"."payments"."buyer_email" IS 'Email of the buyer from Gumroad';



CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text",
    "music_url" "text",
    "status" "text" DEFAULT 'in_progress'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "projects_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referrals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referrer_id" "uuid" NOT NULL,
    "referred_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "reward_granted" boolean DEFAULT false
);


ALTER TABLE "public"."referrals" OWNER TO "postgres";


COMMENT ON COLUMN "public"."referrals"."reward_granted" IS 'True when both users have received their referral credits';



CREATE TABLE IF NOT EXISTS "public"."share_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "screenshot_url" "text" NOT NULL,
    "status" "text" DEFAULT 'approved'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "share_submissions_status_check" CHECK (("status" = ANY (ARRAY['approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."share_submissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."share_submissions" IS 'Tracks social media share submissions for one-time credit rewards';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "credit_balance" integer DEFAULT 1,
    "referral_code" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_config"
    ADD CONSTRAINT "admin_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."clips"
    ADD CONSTRAINT "clips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."final_videos"
    ADD CONSTRAINT "final_videos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."music_tracks"
    ADD CONSTRAINT "music_tracks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_gumroad_sale_id_key" UNIQUE ("gumroad_sale_id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."share_submissions"
    ADD CONSTRAINT "share_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_referral_code_key" UNIQUE ("referral_code");



CREATE INDEX "idx_clips_generation_job_id" ON "public"."clips" USING "btree" ("generation_job_id");



CREATE INDEX "idx_clips_regen_count" ON "public"."clips" USING "btree" ("regen_count");



CREATE INDEX "idx_final_videos_aspect_ratio" ON "public"."final_videos" USING "btree" ("output_aspect_ratio");



CREATE INDEX "idx_final_videos_project_id" ON "public"."final_videos" USING "btree" ("project_id");



CREATE INDEX "idx_final_videos_status" ON "public"."final_videos" USING "btree" ("status");



CREATE INDEX "idx_final_videos_user_id" ON "public"."final_videos" USING "btree" ("user_id");



CREATE INDEX "idx_final_videos_user_null_project" ON "public"."final_videos" USING "btree" ("user_id") WHERE ("project_id" IS NULL);



CREATE INDEX "idx_payments_gumroad_sale_id" ON "public"."payments" USING "btree" ("gumroad_sale_id");



CREATE INDEX "idx_referrals_referred_reward" ON "public"."referrals" USING "btree" ("referred_id", "reward_granted");



CREATE INDEX "idx_referrals_referrer_reward" ON "public"."referrals" USING "btree" ("referrer_id", "reward_granted");



CREATE UNIQUE INDEX "idx_share_submissions_user_id" ON "public"."share_submissions" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "update_music_tracks_updated_at" BEFORE UPDATE ON "public"."music_tracks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."clips"
    ADD CONSTRAINT "clips_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."final_videos"
    ADD CONSTRAINT "final_videos_music_track_id_fkey" FOREIGN KEY ("music_track_id") REFERENCES "public"."music_tracks"("id");



ALTER TABLE ONLY "public"."final_videos"
    ADD CONSTRAINT "final_videos_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."final_videos"
    ADD CONSTRAINT "final_videos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."share_submissions"
    ADD CONSTRAINT "share_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can manage music tracks" ON "public"."music_tracks" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can create clips in their projects" ON "public"."clips" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "clips"."project_id") AND ("projects"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create referrals" ON "public"."referrals" FOR INSERT WITH CHECK (("auth"."uid"() = "referrer_id"));



CREATE POLICY "Users can create their own payments" ON "public"."payments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own projects" ON "public"."projects" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own share submissions" ON "public"."share_submissions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own transactions" ON "public"."credit_transactions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own data" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can manage their own final videos" ON "public"."final_videos" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update clips in their projects" ON "public"."clips" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "clips"."project_id") AND ("projects"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own data" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own projects" ON "public"."projects" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view clips from their projects" ON "public"."clips" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "clips"."project_id") AND ("projects"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own data" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own payments" ON "public"."payments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own projects" ON "public"."projects" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own referrals" ON "public"."referrals" FOR SELECT USING ((("auth"."uid"() = "referrer_id") OR ("auth"."uid"() = "referred_id")));



CREATE POLICY "Users can view their own share submissions" ON "public"."share_submissions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own transactions" ON "public"."credit_transactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."admin_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_config_access" ON "public"."admin_config" USING (true);



ALTER TABLE "public"."clips" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."credit_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."final_videos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."referrals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."share_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."award_share_credits"("target_user_id" "uuid", "credit_amount" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."award_share_credits"("target_user_id" "uuid", "credit_amount" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."award_share_credits"("target_user_id" "uuid", "credit_amount" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_admin_config_table"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_admin_config_table"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_admin_config_table"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_plg_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_plg_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_plg_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_referral_earnings"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_referral_earnings"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_referral_earnings"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_referral_signup"("new_user_id" "uuid", "referrer_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_referral_signup"("new_user_id" "uuid", "referrer_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_referral_signup"("new_user_id" "uuid", "referrer_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_share_for_reward"("target_user_id" "uuid", "screenshot_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_share_for_reward"("target_user_id" "uuid", "screenshot_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_share_for_reward"("target_user_id" "uuid", "screenshot_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_generated_videos_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_generated_videos_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_generated_videos_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_share_reward"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_share_reward"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_share_reward"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."admin_config" TO "anon";
GRANT ALL ON TABLE "public"."admin_config" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_config" TO "service_role";



GRANT ALL ON TABLE "public"."clips" TO "anon";
GRANT ALL ON TABLE "public"."clips" TO "authenticated";
GRANT ALL ON TABLE "public"."clips" TO "service_role";



GRANT ALL ON TABLE "public"."credit_transactions" TO "anon";
GRANT ALL ON TABLE "public"."credit_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."final_videos" TO "anon";
GRANT ALL ON TABLE "public"."final_videos" TO "authenticated";
GRANT ALL ON TABLE "public"."final_videos" TO "service_role";



GRANT ALL ON TABLE "public"."music_tracks" TO "anon";
GRANT ALL ON TABLE "public"."music_tracks" TO "authenticated";
GRANT ALL ON TABLE "public"."music_tracks" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."referrals" TO "anon";
GRANT ALL ON TABLE "public"."referrals" TO "authenticated";
GRANT ALL ON TABLE "public"."referrals" TO "service_role";



GRANT ALL ON TABLE "public"."share_submissions" TO "anon";
GRANT ALL ON TABLE "public"."share_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."share_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






RESET ALL;
