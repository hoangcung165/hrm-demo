package com.hrmdemo.repository.employee;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Employees of the current Legal entity (Hibernate adds the filter, as for every root entity). */
public interface EmployeeRepository extends JpaRepository<Employee, UUID>, JpaSpecificationExecutor<Employee> {

    boolean existsByCode(String code);

    Optional<Employee> findFirstByIdNumber(String idNumber);

    Optional<Employee> findFirstByTaxCode(String taxCode);

    Optional<Employee> findFirstBySocialInsuranceNumber(String socialInsuranceNumber);

    /** Employees in any status but the given one, e.g. every active Employee with {@code INACTIVE}. */
    long countByStatusNot(EmployeeStatus status);

    /** Employee records that point at the unit, whatever their status. */
    long countByOrgUnitId(UUID orgUnitId);

    /** Active Employees per unit they belong to directly: rows of {@code [orgUnitId, count]}. */
    @Query("""
            select e.orgUnitId, count(e) from Employee e
            where e.orgUnitId is not null and e.status <> com.hrmdemo.entity.employee.EmployeeStatus.INACTIVE
            group by e.orgUnitId""")
    List<Object[]> countActiveByOrgUnit();

    /** The positions among {@code positionIds} that some Employee holds, whatever its status. */
    @Query("select distinct e.positionId from Employee e where e.positionId in :positionIds")
    Set<UUID> findPositionIdsIn(@Param("positionIds") Collection<UUID> positionIds);
}
