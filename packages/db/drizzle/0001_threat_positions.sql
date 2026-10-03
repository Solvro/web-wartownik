CREATE TABLE "threat_positions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "threat_positions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"threat_id" varchar(64) NOT NULL,
	"type" varchar(16) NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "threat_positions_threat_time_idx" ON "threat_positions" USING btree ("threat_id","recorded_at");--> statement-breakpoint
CREATE INDEX "threat_positions_recorded_at_idx" ON "threat_positions" USING btree ("recorded_at");