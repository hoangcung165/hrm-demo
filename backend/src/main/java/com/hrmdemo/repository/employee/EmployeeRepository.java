package com.hrmdemo.repository.employee;

import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.entity.employee.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/** Employees of the current Legal entity (Hibernate adds the filter, as for every root entity). */
public interface EmployeeRepository extends JpaRepository<Employee, UUID>, JpaSpecificationExecutor<Employee> {

    boolean existsByCode(String code);

    Optional<Employee> findFirstByIdNumber(String idNumber);

    Optional<Employee> findFirstByTaxCode(String taxCode);

    Optional<Employee> findFirstBySocialInsuranceNumber(String socialInsuranceNumber);
}
