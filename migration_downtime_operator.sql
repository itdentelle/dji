-- Migration to add 'dikerjakan_oleh' to downtime_records

ALTER TABLE public.downtime_records
ADD COLUMN dikerjakan_oleh varchar(100) NULL;

COMMENT ON COLUMN public.downtime_records.dikerjakan_oleh IS 'Pihak yang mengerjakan downtime (Operator, Mekanik/Teknisi, Lainnya)';

