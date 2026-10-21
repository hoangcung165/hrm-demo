package com.hrmdemo.repository.employee;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Employees of the current Legal entity (Hibernate adds the filter, as for every root entity). */
public interface EmployeeRepository extends JpaRepository<Employee, UUID>, JpaSpecificationExecutor<Employee> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Employee e where e.id = :id")
    Optional<Employee> lockForRecordEdit(@Param("id") UUID id);

    boolean existsByCode(String code);

    Optional<Employee> findFirstByIdNumber(String idNumber);

    Optional<Employee> findFirstByTaxCode(String taxCode);

    Optional<Employee> findFirstBySocialInsuranceNumber(String socialInsuranceNumber);

    /** For the Excel import, which looks up a whole file at once (at most 1,000 rows). */
    List<Employee> findAllByCodeIn(Collection<String> codes);

    List<Employee> findAllByIdNumberIn(Collection<String> idNumbers);

    List<Employee> findAllByTaxCodeIn(Collection<String> taxCodes);

    List<Employee> findAllBySocialInsuranceNumberIn(Collection<String> socialInsuranceNumbers);

    /** The codes among {@code codes} that are taken, e.g. to issue many new codes at once. */
    @Query("select e.code from Employee e where e.code in :codes")
    Set<String> findCodesIn(@Param("codes") Collection<String> codes);

    /** Employees in any status but the given one, e.g. every active Employee with {@code INACTIVE}. */
    long countByStatusNot(EmployeeStatus status);

    /** Employee records that point at the unit, whatever their status. */
    long countByOrgUnitId(UUID orgUnitId);

    /** Employees that belong directly to one of the units, whatever their status. */
    List<Employee> findByOrgUnitIdIn(Collection<UUID> orgUnitIds);

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
