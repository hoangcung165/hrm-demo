package com.hrmdemo.controller.employee;

import java.util.List;
import java.util.UUID;

import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.employee.EmployeeQualificationsService;
import com.hrmdemo.service.employee.EmployeeQualificationsService.CertificateRequest;
import com.hrmdemo.service.employee.EmployeeQualificationsService.CertificateView;
import com.hrmdemo.service.employee.EmployeeQualificationsService.SkillRequest;
import com.hrmdemo.service.employee.EmployeeQualificationsService.SkillView;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Employee skills and certificate metadata. Certificate files use the private attachment API. */
@RestController
@RequestMapping("/api/employees/{employeeId}")
@RequiredArgsConstructor
public class EmployeeQualificationsController {
    private final EmployeeQualificationsService service;

    @GetMapping("/skills")
    List<SkillView> skills(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId) {
        return service.skills(caller, employeeId);
    }

    @PostMapping("/skills")
    @ResponseStatus(HttpStatus.CREATED)
    SkillView addSkill(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId,
            @RequestBody SkillRequest request) {
        return service.addSkill(caller, employeeId, request);
    }

    @PutMapping("/skills/{id}")
    SkillView editSkill(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId,
            @PathVariable UUID id, @RequestBody SkillRequest request) {
        return service.editSkill(caller, employeeId, id, request);
    }

    @DeleteMapping("/skills/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteSkill(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId,
            @PathVariable UUID id) {
        service.deleteSkill(caller, employeeId, id);
    }

    @GetMapping("/certificates")
    List<CertificateView> certificates(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId) {
        return service.certificates(caller, employeeId);
    }

    @PostMapping("/certificates")
    @ResponseStatus(HttpStatus.CREATED)
    CertificateView addCertificate(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId,
            @RequestBody CertificateRequest request) {
        return service.addCertificate(caller, employeeId, request);
    }

    @PutMapping("/certificates/{id}")
    CertificateView editCertificate(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId,
            @PathVariable UUID id, @RequestBody CertificateRequest request) {
        return service.editCertificate(caller, employeeId, id, request);
    }

    @DeleteMapping("/certificates/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteCertificate(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId,
            @PathVariable UUID id) {
        service.deleteCertificate(caller, employeeId, id);
    }
}
