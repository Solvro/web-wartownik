CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE TYPE "public"."report_event_type" AS ENUM('drone', 'protest', 'no_energy', 'other');--> statement-breakpoint
CREATE TYPE "public"."shelter_availability" AS ENUM('always', 'scheduled', 'on_demand');--> statement-breakpoint
CREATE TABLE "defibrillators" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "defibrillators_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"osm_id" varchar(255) NOT NULL,
	"osm_type" varchar(255) NOT NULL,
	"osm_version" integer,
	"location" geography(Point, 4326) NOT NULL,
	"access" varchar(255),
	"indoor" varchar(255),
	"emergency" varchar(255) DEFAULT 'defibrillator' NOT NULL,
	"phone" varchar(255),
	"opening_hours" varchar(255),
	"emergency_phone" varchar(255),
	"defibrillator_location" text,
	"defibrillator_location_pl" text,
	"defibrillator_location_en" text,
	"level" varchar(255),
	"check_date" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "defibrillators_osm_id_unique" UNIQUE("osm_id")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"reportEventType" "report_event_type" NOT NULL,
	"description" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shelters" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"location" geometry(Point, 4326) NOT NULL,
	"address" text,
	"commune" varchar(255),
	"county" varchar(255),
	"voivodeship" varchar(255),
	"availability" "shelter_availability" NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "defibrillators_location_idx" ON "defibrillators" USING gist ("location");--> statement-breakpoint
CREATE INDEX "shelters_location_idx" ON "shelters" USING gist ("location");