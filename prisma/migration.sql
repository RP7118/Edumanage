-- Migration SQL query compatible for Supabase (PostgreSQL)

-- SECTION 1: ENUM DEFINITIONS
CREATE TYPE "gender_enum" AS ENUM ('male', 'female', 'other');
CREATE TYPE "student_status_enum" AS ENUM ('active', 'inactive', 'alumni');
CREATE TYPE "employee_role_enum" AS ENUM ('teacher', 'admin', 'librarian', 'staff');
CREATE TYPE "employee_status_enum" AS ENUM ('active', 'resigned', 'inactive');
CREATE TYPE "medium_enum" AS ENUM ('English', 'Hindi', 'Gujarati');
CREATE TYPE "enrollment_status_enum" AS ENUM ('enrolled', 'withdrawn', 'completed');
CREATE TYPE "attendance_status_enum" AS ENUM ('present', 'absent', 'late', 'half_day', 'on_leave');
CREATE TYPE "attendance_source_enum" AS ENUM ('biometric', 'manual', 'manual_bulk');
CREATE TYPE "leave_type_enum" AS ENUM ('sick', 'casual', 'annual', 'other');
CREATE TYPE "leave_status_enum" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "grading_system_enum" AS ENUM ('marks', 'gpa', 'letter', 'custom');
CREATE TYPE "user_role_enum" AS ENUM ('student', 'teacher', 'staff', 'admin');
CREATE TYPE "timetable_status_enum" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "day_of_week_enum" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- SECTION 2: TABLE DEFINITIONS

-- USER & SCHOOL CONFIGURATION
CREATE TABLE "users" (
    "user_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "username" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "user_role_enum" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "users_username_key" UNIQUE ("username")
);

CREATE TABLE "school_configurations" (
    "school_config_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "school_name" VARCHAR(255) NOT NULL,
    "logo_url" VARCHAR(255),
    "motto" VARCHAR(255),
    "email" VARCHAR(255) NOT NULL,
    "contact_numbers" TEXT[] NOT NULL,
    "website_url" VARCHAR(255),
    "address" JSONB NOT NULL,
    "school_type" VARCHAR(100) NOT NULL,
    "affiliation_board" VARCHAR(100) NOT NULL,
    "registration_number" VARCHAR(100) NOT NULL,
    "accreditation_info" TEXT,
    "academic_year_start" DATE,
    "academic_year_end" DATE,
    "grading_system" "grading_system_enum" NOT NULL DEFAULT 'marks',
    "term_count" INTEGER NOT NULL DEFAULT 2,
    "term_names" TEXT[] NOT NULL,
    "class_start_time" TIME(6),
    "class_end_time" TIME(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "school_configurations_pkey" PRIMARY KEY ("school_config_id"),
    CONSTRAINT "school_configurations_email_key" UNIQUE ("email")
);

-- ACADEMICS
CREATE TABLE "academic_years" (
    "academic_year_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "year_name" VARCHAR(100) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("academic_year_id"),
    CONSTRAINT "academic_years_year_name_key" UNIQUE ("year_name")
);

CREATE TABLE "classes" (
    "class_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "class_name" VARCHAR(100) NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "standard" VARCHAR(50) NOT NULL,
    "section" VARCHAR(50) NOT NULL,
    "medium" "medium_enum" NOT NULL,
    "capacity" INTEGER NOT NULL,
    "class_teacher_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("class_id")
);

CREATE TABLE "subjects" (
    "subject_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "subject_name" VARCHAR(100) NOT NULL,
    "subject_code" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("subject_id"),
    CONSTRAINT "subjects_subject_name_key" UNIQUE ("subject_name"),
    CONSTRAINT "subjects_subject_code_key" UNIQUE ("subject_code")
);

CREATE TABLE "course_offerings" (
    "course_offering_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "class_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "teacher_id" UUID,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "course_offerings_pkey" PRIMARY KEY ("course_offering_id")
);

CREATE TABLE "course_materials" (
    "material_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "course_offering_id" UUID NOT NULL,
    "material_name" VARCHAR(255) NOT NULL,
    "file_url" VARCHAR(255) NOT NULL,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "course_materials_pkey" PRIMARY KEY ("material_id")
);

-- EMPLOYEE & RELATED MODELS
CREATE TABLE "departments" (
    "department_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "department_name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("department_id"),
    CONSTRAINT "departments_department_name_key" UNIQUE ("department_name")
);

CREATE TABLE "employees" (
    "employee_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "employee_code" VARCHAR(100) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(20),
    "gender" "gender_enum",
    "dob" DATE,
    "address" TEXT,
    "highest_qualification" VARCHAR(255),
    "years_of_experience" INTEGER,
    "joining_date" DATE NOT NULL,
    "resignation_date" DATE,
    "department_id" UUID,
    "designation" VARCHAR(255),
    "role" "employee_role_enum" NOT NULL DEFAULT 'teacher',
    "employment_type" VARCHAR(100),
    "status" "employee_status_enum" NOT NULL DEFAULT 'active',
    "profile_avatar_url" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("employee_id"),
    CONSTRAINT "employees_user_id_key" UNIQUE ("user_id"),
    CONSTRAINT "employees_employee_code_key" UNIQUE ("employee_code"),
    CONSTRAINT "employees_email_key" UNIQUE ("email"),
    CONSTRAINT "employees_phone_number_key" UNIQUE ("phone_number")
);

CREATE TABLE "employee_salaries" (
    "salary_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "employee_id" UUID NOT NULL,
    "basic_salary" DOUBLE PRECISION NOT NULL,
    "allowances" DOUBLE PRECISION DEFAULT 0,
    "deductions" DOUBLE PRECISION DEFAULT 0,
    "effective_from_date" DATE NOT NULL,
    "effective_to_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "employee_salaries_pkey" PRIMARY KEY ("salary_id")
);

CREATE TABLE "employee_documents" (
    "document_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "employee_id" UUID NOT NULL,
    "document_name" VARCHAR(255) NOT NULL,
    "document_type" VARCHAR(100),
    "file_url" VARCHAR(255) NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("document_id")
);

CREATE TABLE "employee_attendance" (
    "attendance_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "employee_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "attendance_status_enum" NOT NULL,
    "check_in_time" TIMESTAMPTZ(6),
    "check_out_time" TIMESTAMPTZ(6),
    "source" "attendance_source_enum" NOT NULL DEFAULT 'biometric',
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "employee_attendance_pkey" PRIMARY KEY ("attendance_id"),
    CONSTRAINT "employee_attendance_employee_id_date_key" UNIQUE ("employee_id", "date")
);

CREATE TABLE "employee_leaves" (
    "leave_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "employee_id" UUID NOT NULL,
    "leave_type" "leave_type_enum" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "leave_status_enum" NOT NULL DEFAULT 'pending',
    "supporting_document_url" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "employee_leaves_pkey" PRIMARY KEY ("leave_id")
);

CREATE TABLE "leave_status_history" (
    "history_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "leave_id" UUID NOT NULL,
    "status" "leave_status_enum" NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "leave_status_history_pkey" PRIMARY KEY ("history_id")
);

-- STUDENT & RELATED MODELS
CREATE TABLE "admissions" (
    "admission_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "student_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "admission_number" VARCHAR(100) NOT NULL,
    "gr_number" VARCHAR(100) NOT NULL,
    "roll_number" VARCHAR(50),
    "admission_date" DATE NOT NULL,
    "form_number" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "admissions_pkey" PRIMARY KEY ("admission_id"),
    CONSTRAINT "admissions_admission_number_key" UNIQUE ("admission_number"),
    CONSTRAINT "admissions_gr_number_key" UNIQUE ("gr_number")
);

CREATE TABLE "students" (
    "student_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "dob" DATE NOT NULL,
    "gender" "gender_enum",
    "profile_avatar_url" VARCHAR(255),
    "status" "student_status_enum" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("student_id"),
    CONSTRAINT "students_user_id_key" UNIQUE ("user_id")
);

CREATE TABLE "student_attendance" (
    "attendance_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "student_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "attendance_status_enum" NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "student_attendance_pkey" PRIMARY KEY ("attendance_id"),
    CONSTRAINT "student_date_attendance_unique" UNIQUE ("student_id", "date")
);

CREATE TABLE "student_details" (
    "student_id" UUID NOT NULL,
    "middle_name" VARCHAR(100),
    "birth_place" VARCHAR(255),
    "religion" VARCHAR(50),
    "caste" VARCHAR(50),
    "reservation_category" VARCHAR(50),
    "blood_group" VARCHAR(5),
    "aadhar_number" VARCHAR(20),
    "uid_number" VARCHAR(255),
    "apaar_id" VARCHAR(255),
    "pen_number" VARCHAR(255),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "student_details_pkey" PRIMARY KEY ("student_id"),
    CONSTRAINT "student_details_aadhar_number_key" UNIQUE ("aadhar_number"),
    CONSTRAINT "student_details_uid_number_key" UNIQUE ("uid_number"),
    CONSTRAINT "student_details_apaar_id_key" UNIQUE ("apaar_id"),
    CONSTRAINT "student_details_pen_number_key" UNIQUE ("pen_number")
);

CREATE TABLE "student_course_enrollments" (
    "enrollment_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "student_id" UUID NOT NULL,
    "course_offering_id" UUID NOT NULL,
    "enrollment_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "status" "enrollment_status_enum" NOT NULL DEFAULT 'enrolled',
    "final_grade" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "student_course_enrollments_pkey" PRIMARY KEY ("enrollment_id")
);

CREATE TABLE "student_family_details" (
    "family_detail_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "student_id" UUID NOT NULL,
    "father_name" VARCHAR(255) NOT NULL,
    "father_occupation" VARCHAR(100),
    "father_contact_number" VARCHAR(50),
    "father_annual_income" DOUBLE PRECISION,
    "mother_name" VARCHAR(255) NOT NULL,
    "mother_occupation" VARCHAR(100),
    "mother_contact_number" VARCHAR(50),
    "mother_annual_income" DOUBLE PRECISION,
    "guardian_name" VARCHAR(255),
    "guardian_occupation" VARCHAR(100),
    "guardian_contact_number" VARCHAR(50),
    "guardian_address" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "student_family_details_pkey" PRIMARY KEY ("family_detail_id"),
    CONSTRAINT "student_family_details_student_id_key" UNIQUE ("student_id")
);

CREATE TABLE "student_previous_academic_details" (
    "academic_detail_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "student_id" UUID NOT NULL,
    "previous_school_name" VARCHAR(255),
    "previous_school_address" TEXT,
    "previous_school_standard" VARCHAR(100),
    "school_udise_code" VARCHAR(100),
    "board_seat_number" VARCHAR(100),
    "board_sid_number" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "student_previous_academic_details_pkey" PRIMARY KEY ("academic_detail_id"),
    CONSTRAINT "student_previous_academic_details_student_id_key" UNIQUE ("student_id")
);

CREATE TABLE "student_payment_details" (
    "payment_detail_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "student_id" UUID NOT NULL,
    "account_holder_name" VARCHAR(255),
    "bank_name" VARCHAR(255),
    "ifsc_code" VARCHAR(100),
    "account_number" VARCHAR(100),
    "bank_branch" VARCHAR(100),
    "has_scholarship" BOOLEAN NOT NULL DEFAULT false,
    "scholarship_amount" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "student_payment_details_pkey" PRIMARY KEY ("payment_detail_id"),
    CONSTRAINT "student_payment_details_student_id_key" UNIQUE ("student_id")
);

CREATE TABLE "student_hostel_details" (
    "hostel_detail_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "student_id" UUID NOT NULL,
    "hostel_name" VARCHAR(255),
    "warden_name" VARCHAR(255),
    "warden_contact" VARCHAR(100),
    "hostel_contact" VARCHAR(100),
    "hostel_address" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "student_hostel_details_pkey" PRIMARY KEY ("hostel_detail_id"),
    CONSTRAINT "student_hostel_details_student_id_key" UNIQUE ("student_id")
);

CREATE TABLE "student_facilities" (
    "facility_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "student_id" UUID NOT NULL,
    "cafeteria" BOOLEAN NOT NULL DEFAULT false,
    "transportation" BOOLEAN NOT NULL DEFAULT false,
    "hostel" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "student_facilities_pkey" PRIMARY KEY ("facility_id"),
    CONSTRAINT "student_facilities_student_id_key" UNIQUE ("student_id")
);

CREATE TABLE "student_addresses" (
    "address_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "student_id" UUID NOT NULL,
    "address_line" TEXT NOT NULL,
    "village" VARCHAR(100),
    "taluka" VARCHAR(100),
    "district" VARCHAR(100),
    "primary_contact" VARCHAR(100),
    "secondary_contact" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "student_addresses_pkey" PRIMARY KEY ("address_id")
);

CREATE TABLE "student_documents" (
    "document_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "student_id" UUID NOT NULL,
    "document_type" VARCHAR(100) NOT NULL,
    "file_url" VARCHAR(255) NOT NULL,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "student_documents_pkey" PRIMARY KEY ("document_id")
);

-- TIMETABLE
CREATE TABLE "timetables" (
    "timetable_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "class_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "status" "timetable_status_enum" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "timetables_pkey" PRIMARY KEY ("timetable_id"),
    CONSTRAINT "timetables_class_id_academic_year_id_key" UNIQUE ("class_id", "academic_year_id")
);

CREATE TABLE "timetable_slots" (
    "slot_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "timetable_id" UUID NOT NULL,
    "day_of_week" "day_of_week_enum" NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "is_break" BOOLEAN NOT NULL DEFAULT false,
    "subject_id" UUID,
    "teacher_id" UUID,
    "room_number" VARCHAR(50),

    CONSTRAINT "timetable_slots_pkey" PRIMARY KEY ("slot_id")
);

-- SECTION 3: FOREIGN KEY CONSTRAINTS
ALTER TABLE "classes" ADD CONSTRAINT "classes_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("academic_year_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "classes" ADD CONSTRAINT "classes_class_teacher_id_fkey" FOREIGN KEY ("class_teacher_id") REFERENCES "employees"("employee_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("class_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "employees"("employee_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "course_materials" ADD CONSTRAINT "course_materials_course_offering_id_fkey" FOREIGN KEY ("course_offering_id") REFERENCES "course_offerings"("course_offering_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("department_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "employee_salaries" ADD CONSTRAINT "employee_salaries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_attendance" ADD CONSTRAINT "employee_attendance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_leaves" ADD CONSTRAINT "employee_leaves_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_status_history" ADD CONSTRAINT "leave_status_history_leave_id_fkey" FOREIGN KEY ("leave_id") REFERENCES "employee_leaves"("leave_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "admissions" ADD CONSTRAINT "admissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("class_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "student_attendance" ADD CONSTRAINT "student_attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_attendance" ADD CONSTRAINT "student_attendance_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("class_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_details" ADD CONSTRAINT "student_details_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_course_enrollments" ADD CONSTRAINT "student_course_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_course_enrollments" ADD CONSTRAINT "student_course_enrollments_course_offering_id_fkey" FOREIGN KEY ("course_offering_id") REFERENCES "course_offerings"("course_offering_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_family_details" ADD CONSTRAINT "student_family_details_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_previous_academic_details" ADD CONSTRAINT "student_previous_academic_details_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_payment_details" ADD CONSTRAINT "student_payment_details_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_hostel_details" ADD CONSTRAINT "student_hostel_details_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_facilities" ADD CONSTRAINT "student_facilities_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_addresses" ADD CONSTRAINT "student_addresses_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "timetables" ADD CONSTRAINT "timetables_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("class_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("academic_year_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_timetable_id_fkey" FOREIGN KEY ("timetable_id") REFERENCES "timetables"("timetable_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "employees"("employee_id") ON DELETE SET NULL ON UPDATE CASCADE;