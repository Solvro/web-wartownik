CREATE TYPE "public"."region_alert_status" AS ENUM('none', 'watch', 'approaching', 'threat');--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "push_subscriptions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"token" varchar(255) NOT NULL,
	"platform" varchar(16) NOT NULL,
	"region_ids" text[] NOT NULL,
	"min_status" "region_alert_status" DEFAULT 'approaching' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "region_alert_state" (
	"region_id" varchar(16) PRIMARY KEY NOT NULL,
	"status" "region_alert_status" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
