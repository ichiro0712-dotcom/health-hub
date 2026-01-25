


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."Account" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "type" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "providerAccountId" "text" NOT NULL,
    "refresh_token" "text",
    "access_token" "text",
    "expires_at" integer,
    "token_type" "text",
    "scope" "text",
    "id_token" "text",
    "session_state" "text"
);


ALTER TABLE "public"."Account" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."DetailedSleep" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "date" "date" NOT NULL,
    "logId" "text" NOT NULL,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone NOT NULL,
    "duration" integer NOT NULL,
    "efficiency" integer NOT NULL,
    "minutesAwake" integer NOT NULL,
    "minutesLight" integer NOT NULL,
    "minutesDeep" integer NOT NULL,
    "minutesRem" integer NOT NULL,
    "stages" "jsonb" NOT NULL,
    "raw" "jsonb",
    "syncedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."DetailedSleep" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."FitData" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "date" timestamp(3) without time zone NOT NULL,
    "heartRate" double precision,
    "steps" integer,
    "weight" double precision,
    "raw" "jsonb",
    "distance" double precision,
    "calories" double precision,
    "sleepMinutes" integer,
    "sleepData" "jsonb",
    "vitals" "jsonb",
    "workouts" "jsonb",
    "source" "text",
    "fitbitSyncId" "text",
    "respiratoryRate" double precision,
    "skinTemperature" double precision,
    "syncedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."FitData" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."FitbitAccount" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "fitbitUserId" "text" NOT NULL,
    "accessToken" "text" NOT NULL,
    "refreshToken" "text" NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "scope" "text" NOT NULL,
    "tokenType" "text" DEFAULT 'Bearer'::"text" NOT NULL,
    "codeVerifier" "text",
    "lastSyncedAt" timestamp(3) without time zone,
    "initialSyncCompleted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."FitbitAccount" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."GoogleDocsSettings" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "recordsDocId" "text",
    "recordsHeaderText" "text",
    "profileDocId" "text",
    "profileHeaderText" "text",
    "autoSyncEnabled" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."GoogleDocsSettings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."HealthProfileSection" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "categoryId" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "orderIndex" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."HealthProfileSection" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."HealthRecord" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "date" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "title" "text",
    "summary" "text",
    "data" "jsonb" NOT NULL,
    "additional_data" "jsonb",
    "images" "text"[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."HealthRecord" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."HrvData" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "date" "date" NOT NULL,
    "dailyRmssd" double precision NOT NULL,
    "deepRmssd" double precision,
    "coverage" double precision,
    "lowFrequency" double precision,
    "highFrequency" double precision,
    "raw" "jsonb",
    "syncedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."HrvData" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."InspectionItem" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "name" "text" NOT NULL,
    "masterItemCode" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."InspectionItem" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."InspectionItemAlias" (
    "id" "text" NOT NULL,
    "inspectionItemId" "text" NOT NULL,
    "originalName" "text" NOT NULL
);


ALTER TABLE "public"."InspectionItemAlias" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."InspectionItemHistory" (
    "id" "text" NOT NULL,
    "inspectionItemId" "text" NOT NULL,
    "operationType" "text" NOT NULL,
    "details" "jsonb" NOT NULL,
    "undoCommand" "text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."InspectionItemHistory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."IntradayHeartRate" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "date" "date" NOT NULL,
    "restingHeartRate" integer,
    "outOfRangeMinutes" integer,
    "fatBurnMinutes" integer,
    "cardioMinutes" integer,
    "peakMinutes" integer,
    "intradayData" "jsonb" NOT NULL,
    "raw" "jsonb",
    "syncedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."IntradayHeartRate" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."LifestyleHabit" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "category" "text" NOT NULL,
    "name" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."LifestyleHabit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."MasterItem" (
    "code" "text" NOT NULL,
    "standardName" "text" NOT NULL,
    "jlac10" "text",
    "synonyms" "text"[]
);


ALTER TABLE "public"."MasterItem" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Session" (
    "id" "text" NOT NULL,
    "sessionToken" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "expires" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."Session" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Supplement" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "name" "text" NOT NULL,
    "timing" "text"[],
    "order" integer DEFAULT 0 NOT NULL,
    "amount" "text" NOT NULL,
    "unit" "text" NOT NULL,
    "manufacturer" "text",
    "note" "text",
    "startDate" timestamp(3) without time zone,
    "pausedPeriods" "jsonb",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."Supplement" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."User" (
    "id" "text" NOT NULL,
    "name" "text",
    "email" "text",
    "emailVerified" timestamp(3) without time zone,
    "image" "text",
    "birthDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."User" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."UserHealthItemSetting" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "itemName" "text" NOT NULL,
    "minVal" double precision DEFAULT 0 NOT NULL,
    "maxVal" double precision DEFAULT 100 NOT NULL,
    "safeMin" double precision,
    "safeMax" double precision,
    "tags" "text"[],
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."UserHealthItemSetting" OWNER TO "postgres";


ALTER TABLE ONLY "public"."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."DetailedSleep"
    ADD CONSTRAINT "DetailedSleep_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."FitData"
    ADD CONSTRAINT "FitData_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."FitbitAccount"
    ADD CONSTRAINT "FitbitAccount_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."GoogleDocsSettings"
    ADD CONSTRAINT "GoogleDocsSettings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."HealthProfileSection"
    ADD CONSTRAINT "HealthProfileSection_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."HealthRecord"
    ADD CONSTRAINT "HealthRecord_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."HrvData"
    ADD CONSTRAINT "HrvData_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."InspectionItemAlias"
    ADD CONSTRAINT "InspectionItemAlias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."InspectionItemHistory"
    ADD CONSTRAINT "InspectionItemHistory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."InspectionItem"
    ADD CONSTRAINT "InspectionItem_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."IntradayHeartRate"
    ADD CONSTRAINT "IntradayHeartRate_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."LifestyleHabit"
    ADD CONSTRAINT "LifestyleHabit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."MasterItem"
    ADD CONSTRAINT "MasterItem_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Supplement"
    ADD CONSTRAINT "Supplement_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."UserHealthItemSetting"
    ADD CONSTRAINT "UserHealthItemSetting_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account" USING "btree" ("provider", "providerAccountId");



CREATE INDEX "DetailedSleep_userId_date_idx" ON "public"."DetailedSleep" USING "btree" ("userId", "date");



CREATE UNIQUE INDEX "DetailedSleep_userId_logId_key" ON "public"."DetailedSleep" USING "btree" ("userId", "logId");



CREATE UNIQUE INDEX "FitData_userId_date_key" ON "public"."FitData" USING "btree" ("userId", "date");



CREATE UNIQUE INDEX "FitbitAccount_userId_key" ON "public"."FitbitAccount" USING "btree" ("userId");



CREATE UNIQUE INDEX "GoogleDocsSettings_userId_key" ON "public"."GoogleDocsSettings" USING "btree" ("userId");



CREATE UNIQUE INDEX "HealthProfileSection_userId_categoryId_key" ON "public"."HealthProfileSection" USING "btree" ("userId", "categoryId");



CREATE INDEX "HealthProfileSection_userId_idx" ON "public"."HealthProfileSection" USING "btree" ("userId");



CREATE INDEX "HrvData_userId_date_idx" ON "public"."HrvData" USING "btree" ("userId", "date");



CREATE UNIQUE INDEX "HrvData_userId_date_key" ON "public"."HrvData" USING "btree" ("userId", "date");



CREATE UNIQUE INDEX "InspectionItemAlias_inspectionItemId_originalName_key" ON "public"."InspectionItemAlias" USING "btree" ("inspectionItemId", "originalName");



CREATE INDEX "InspectionItemAlias_originalName_idx" ON "public"."InspectionItemAlias" USING "btree" ("originalName");



CREATE UNIQUE INDEX "InspectionItem_userId_name_key" ON "public"."InspectionItem" USING "btree" ("userId", "name");



CREATE INDEX "IntradayHeartRate_userId_date_idx" ON "public"."IntradayHeartRate" USING "btree" ("userId", "date");



CREATE UNIQUE INDEX "IntradayHeartRate_userId_date_key" ON "public"."IntradayHeartRate" USING "btree" ("userId", "date");



CREATE UNIQUE INDEX "LifestyleHabit_userId_category_name_key" ON "public"."LifestyleHabit" USING "btree" ("userId", "category", "name");



CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session" USING "btree" ("sessionToken");



CREATE UNIQUE INDEX "UserHealthItemSetting_userId_itemName_key" ON "public"."UserHealthItemSetting" USING "btree" ("userId", "itemName");



CREATE UNIQUE INDEX "User_email_key" ON "public"."User" USING "btree" ("email");



ALTER TABLE ONLY "public"."Account"
    ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."DetailedSleep"
    ADD CONSTRAINT "DetailedSleep_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."FitData"
    ADD CONSTRAINT "FitData_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."FitbitAccount"
    ADD CONSTRAINT "FitbitAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."GoogleDocsSettings"
    ADD CONSTRAINT "GoogleDocsSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."HealthProfileSection"
    ADD CONSTRAINT "HealthProfileSection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."HealthRecord"
    ADD CONSTRAINT "HealthRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."HrvData"
    ADD CONSTRAINT "HrvData_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."InspectionItemAlias"
    ADD CONSTRAINT "InspectionItemAlias_inspectionItemId_fkey" FOREIGN KEY ("inspectionItemId") REFERENCES "public"."InspectionItem"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."InspectionItemHistory"
    ADD CONSTRAINT "InspectionItemHistory_inspectionItemId_fkey" FOREIGN KEY ("inspectionItemId") REFERENCES "public"."InspectionItem"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."InspectionItem"
    ADD CONSTRAINT "InspectionItem_masterItemCode_fkey" FOREIGN KEY ("masterItemCode") REFERENCES "public"."MasterItem"("code") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."InspectionItem"
    ADD CONSTRAINT "InspectionItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."IntradayHeartRate"
    ADD CONSTRAINT "IntradayHeartRate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."LifestyleHabit"
    ADD CONSTRAINT "LifestyleHabit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Supplement"
    ADD CONSTRAINT "Supplement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."UserHealthItemSetting"
    ADD CONSTRAINT "UserHealthItemSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";








































































































































































GRANT ALL ON TABLE "public"."Account" TO "anon";
GRANT ALL ON TABLE "public"."Account" TO "authenticated";
GRANT ALL ON TABLE "public"."Account" TO "service_role";



GRANT ALL ON TABLE "public"."DetailedSleep" TO "anon";
GRANT ALL ON TABLE "public"."DetailedSleep" TO "authenticated";
GRANT ALL ON TABLE "public"."DetailedSleep" TO "service_role";



GRANT ALL ON TABLE "public"."FitData" TO "anon";
GRANT ALL ON TABLE "public"."FitData" TO "authenticated";
GRANT ALL ON TABLE "public"."FitData" TO "service_role";



GRANT ALL ON TABLE "public"."FitbitAccount" TO "anon";
GRANT ALL ON TABLE "public"."FitbitAccount" TO "authenticated";
GRANT ALL ON TABLE "public"."FitbitAccount" TO "service_role";



GRANT ALL ON TABLE "public"."GoogleDocsSettings" TO "anon";
GRANT ALL ON TABLE "public"."GoogleDocsSettings" TO "authenticated";
GRANT ALL ON TABLE "public"."GoogleDocsSettings" TO "service_role";



GRANT ALL ON TABLE "public"."HealthProfileSection" TO "anon";
GRANT ALL ON TABLE "public"."HealthProfileSection" TO "authenticated";
GRANT ALL ON TABLE "public"."HealthProfileSection" TO "service_role";



GRANT ALL ON TABLE "public"."HealthRecord" TO "anon";
GRANT ALL ON TABLE "public"."HealthRecord" TO "authenticated";
GRANT ALL ON TABLE "public"."HealthRecord" TO "service_role";



GRANT ALL ON TABLE "public"."HrvData" TO "anon";
GRANT ALL ON TABLE "public"."HrvData" TO "authenticated";
GRANT ALL ON TABLE "public"."HrvData" TO "service_role";



GRANT ALL ON TABLE "public"."InspectionItem" TO "anon";
GRANT ALL ON TABLE "public"."InspectionItem" TO "authenticated";
GRANT ALL ON TABLE "public"."InspectionItem" TO "service_role";



GRANT ALL ON TABLE "public"."InspectionItemAlias" TO "anon";
GRANT ALL ON TABLE "public"."InspectionItemAlias" TO "authenticated";
GRANT ALL ON TABLE "public"."InspectionItemAlias" TO "service_role";



GRANT ALL ON TABLE "public"."InspectionItemHistory" TO "anon";
GRANT ALL ON TABLE "public"."InspectionItemHistory" TO "authenticated";
GRANT ALL ON TABLE "public"."InspectionItemHistory" TO "service_role";



GRANT ALL ON TABLE "public"."IntradayHeartRate" TO "anon";
GRANT ALL ON TABLE "public"."IntradayHeartRate" TO "authenticated";
GRANT ALL ON TABLE "public"."IntradayHeartRate" TO "service_role";



GRANT ALL ON TABLE "public"."LifestyleHabit" TO "anon";
GRANT ALL ON TABLE "public"."LifestyleHabit" TO "authenticated";
GRANT ALL ON TABLE "public"."LifestyleHabit" TO "service_role";



GRANT ALL ON TABLE "public"."MasterItem" TO "anon";
GRANT ALL ON TABLE "public"."MasterItem" TO "authenticated";
GRANT ALL ON TABLE "public"."MasterItem" TO "service_role";



GRANT ALL ON TABLE "public"."Session" TO "anon";
GRANT ALL ON TABLE "public"."Session" TO "authenticated";
GRANT ALL ON TABLE "public"."Session" TO "service_role";



GRANT ALL ON TABLE "public"."Supplement" TO "anon";
GRANT ALL ON TABLE "public"."Supplement" TO "authenticated";
GRANT ALL ON TABLE "public"."Supplement" TO "service_role";



GRANT ALL ON TABLE "public"."User" TO "anon";
GRANT ALL ON TABLE "public"."User" TO "authenticated";
GRANT ALL ON TABLE "public"."User" TO "service_role";



GRANT ALL ON TABLE "public"."UserHealthItemSetting" TO "anon";
GRANT ALL ON TABLE "public"."UserHealthItemSetting" TO "authenticated";
GRANT ALL ON TABLE "public"."UserHealthItemSetting" TO "service_role";









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































