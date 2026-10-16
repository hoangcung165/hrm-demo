package com.hrmdemo.repository.leave;

import java.util.List;
import java.util.UUID;

import com.hrmdemo.entity.leave.LeaveType;
import org.springframework.data.jpa.repository.JpaRepository;

/** Loại nghỉ of the company; queries are filtered by Legal entity (ADR 0003). */
public interface LeaveTypeRepository extends JpaRepository<LeaveType, UUID> {

    List<LeaveType> findAllByOrderBySortOrderAscNameAsc();

    boolean existsByCodeIgnoreCase(String code);

}
