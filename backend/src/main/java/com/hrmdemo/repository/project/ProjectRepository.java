package com.hrmdemo.repository.project;

import java.util.UUID;

import com.hrmdemo.entity.project.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/** Dự án; filtered by Legal entity (ADR 0003). */
public interface ProjectRepository extends JpaRepository<Project, UUID>, JpaSpecificationExecutor<Project> {

    /** Whether a project already has the code, whatever the case. */
    boolean existsByCodeIgnoreCase(String code);
}
