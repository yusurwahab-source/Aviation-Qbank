CREATE TABLE "post_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" varchar(20) NOT NULL,
	"byte_size" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"file_name" varchar(100) NOT NULL,
	"uploaded_by" varchar(254) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
