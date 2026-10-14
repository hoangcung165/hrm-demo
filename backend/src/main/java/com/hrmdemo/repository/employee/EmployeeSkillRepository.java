package com.hrmdemo.repository.employee;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.entity.employee.EmployeeSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmployeeSkillRepository extends JpaRepository<EmployeeSkill, UUID> {
    List<EmployeeSkill> findByEmployeeIdOrderByCreatedAtAsc(UUID employeeId);
    Optional<EmployeeSkill> findByIdAndEmployeeId(UUID id, UUID employeeId);
    boolean existsByEmployeeIdAndSkillId(UUID employeeId, UUID skillId);
    boolean existsByEmployeeIdAndSkillIdAndIdNot(UUID employeeId, UUID skillId, UUID id);

    @Query("select distinct s.skillId from EmployeeSkill s where s.skillId in :ids")
    Set<UUID> findReferencedSkillIds(@Param("ids") Collection<UUID> ids);
}
