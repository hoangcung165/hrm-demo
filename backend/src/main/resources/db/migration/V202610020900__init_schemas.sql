-- Mỗi context một schema (ADR 0002). Không truy vấn chéo schema giữa các context.
CREATE SCHEMA IF NOT EXISTS org;
CREATE SCHEMA IF NOT EXISTS people;
CREATE SCHEMA IF NOT EXISTS time;
CREATE SCHEMA IF NOT EXISTS payroll;
CREATE SCHEMA IF NOT EXISTS projects;
