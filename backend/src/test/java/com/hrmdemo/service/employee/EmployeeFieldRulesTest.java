package com.hrmdemo.service.employee;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hrmdemo.dto.employee.EmergencyContact;
import com.hrmdemo.dto.employee.EmployeeCreateRequest;
import com.hrmdemo.dto.employee.EmployeeIdentityRequest;
import com.hrmdemo.dto.employee.EmployeeJobRequest;
import com.hrmdemo.dto.employee.EmployeePersonalRequest;
import com.hrmdemo.entity.employee.EmployeeStatus;
import com.hrmdemo.entity.employee.Gender;
import com.hrmdemo.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

/** The field rules of a new Employee (PRD story 18): every failing field is reported with its own code. */
class EmployeeFieldRulesTest {

    static final LocalDate TODAY = LocalDate.of(2026, 10, 6);
    static final UUID POSITION = UUID.fromString("00000000-0000-0000-0000-0000000000c1");
    static final String CCCD = "079194005678";

    @Test
    void aCompleteRequestIsNormalizedAndStartsOnProbation() {
        EmployeeFieldRules.Checked checked = EmployeeFieldRules.check(new EmployeeCreateRequest(
                "  Trần   Thị\tMai ",
                new EmployeePersonalRequest(LocalDate.of(1994, 3, 12), "FEMALE", " Mai.Tran@Example.com ",
                        "0912 345.678", "  12 Lê Lợi  ", new EmergencyContact(" Trần  Văn Hùng ", "Cha", "+84987654321")),
                new EmployeeIdentityRequest("079 194 005 678", LocalDate.of(2021, 5, 1), " Cục CS QLHC về TTXH ",
                        CCCD, "7912341234"),
                new EmployeeJobRequest(null, POSITION, null, LocalDate.of(2026, 11, 1), null)), TODAY);

        assertThat(checked.personal().fullName()).isEqualTo("Trần Thị Mai");
        assertThat(checked.personal().gender()).isEqualTo(Gender.FEMALE);
        assertThat(checked.personal().personalEmail()).isEqualTo("mai.tran@example.com");
        assertThat(checked.personal().phone()).isEqualTo("0912345678");
        assertThat(checked.personal().address()).isEqualTo("12 Lê Lợi");
        assertThat(checked.personal().emergencyContactName()).isEqualTo("Trần Văn Hùng");
        assertThat(checked.personal().emergencyContactPhone()).isEqualTo("0987654321");
        assertThat(checked.identity().idNumber()).isEqualTo(CCCD);
        assertThat(checked.identity().idIssuePlace()).isEqualTo("Cục CS QLHC về TTXH");
        assertThat(checked.identity().taxCode()).isEqualTo(CCCD);
        assertThat(checked.identity().socialInsuranceNumber()).isEqualTo("7912341234");
        assertThat(checked.job().status()).isEqualTo(EmployeeStatus.PROBATION);
        assertThat(checked.job().orgUnitId()).isNull();
    }

    @Test
    void anEmptyRequestNamesEveryRequiredField() {
        assertErrors(new EmployeeCreateRequest(null, null, null, null), Map.of(
                "fullName", "required",
                "personal.dateOfBirth", "required",
                "personal.gender", "required",
                "identity.idNumber", "required",
                "job.positionId", "required",
                "job.hireDate", "required"));
    }

    @Test
    void theCccdIsExactlyTwelveDigits() {
        assertErrors(request(identity("07919400567", null, null)), Map.of("identity.idNumber", "invalid"));
        assertErrors(request(identity("0791940056789", null, null)), Map.of("identity.idNumber", "invalid"));
        assertErrors(request(identity("07919400567A", null, null)), Map.of("identity.idNumber", "invalid"));
        assertErrors(request(identity("   ", null, null)), Map.of("identity.idNumber", "required"));
    }

    @Test
    void theTaxCodeAndTheInsuranceNumberHaveTenDigitsOrAreTheCccd() {
        assertThat(EmployeeFieldRules.check(request(identity(CCCD, "0312345678", CCCD)), TODAY).identity())
                .satisfies(identity -> {
                    assertThat(identity.taxCode()).isEqualTo("0312345678");
                    assertThat(identity.socialInsuranceNumber()).isEqualTo(CCCD);
                });

        assertErrors(request(identity(CCCD, "079194005679", "079194005670")), Map.of(
                "identity.taxCode", "not_id_number",
                "identity.socialInsuranceNumber", "not_id_number"));
        assertErrors(request(identity(CCCD, "031234567", "79123412345")), Map.of(
                "identity.taxCode", "invalid",
                "identity.socialInsuranceNumber", "invalid"));
        // With a bad CCCD only the CCCD is reported; the 12-digit numbers are not compared with it.
        assertErrors(request(identity("123", "079194005679", null)), Map.of("identity.idNumber", "invalid"));
    }

    @Test
    void theIssueDateIsNotInTheFutureNorBeforeBirth() {
        assertErrors(request(new EmployeeIdentityRequest(CCCD, TODAY.plusDays(1), null, null, null)),
                Map.of("identity.idIssueDate", "out_of_range"));
        assertErrors(request(new EmployeeIdentityRequest(CCCD, LocalDate.of(1994, 3, 11), null, null, null)),
                Map.of("identity.idIssueDate", "out_of_range"));
        assertErrors(request(new EmployeeIdentityRequest(CCCD, null, "x".repeat(151), null, null)),
                Map.of("identity.idIssuePlace", "too_long"));
    }

    @Test
    void anEmployeeIsAtLeastFifteenOnTheHireDateAndBornAfter1900() {
        LocalDate hire = LocalDate.of(2026, 11, 1);
        assertErrors(withBirth(hire.minusYears(15).plusDays(1), hire), Map.of("personal.dateOfBirth", "under_age"));
        assertThat(EmployeeFieldRules.check(withBirth(hire.minusYears(15), hire), TODAY).personal().dateOfBirth())
                .isEqualTo(hire.minusYears(15));
        assertErrors(withBirth(LocalDate.of(1900, 1, 1), hire), Map.of("personal.dateOfBirth", "out_of_range"));
        assertErrors(withBirth(TODAY, hire), Map.of("personal.dateOfBirth", "out_of_range"));
    }

    @Test
    void theHireDateIsAtMostAYearAhead() {
        assertThat(EmployeeFieldRules.check(withBirth(LocalDate.of(1990, 1, 1), TODAY.plusDays(365)), TODAY)
                .job().hireDate()).isEqualTo(TODAY.plusDays(365));
        assertErrors(withBirth(LocalDate.of(1990, 1, 1), TODAY.plusDays(366)), Map.of("job.hireDate", "out_of_range"));
    }

    @Test
    void theStatusIsProbationOrOfficialNeverInactive() {
        assertThat(EmployeeFieldRules.check(withStatus("OFFICIAL"), TODAY).job().status())
                .isEqualTo(EmployeeStatus.OFFICIAL);
        assertErrors(withStatus("INACTIVE"), Map.of("job.status", "invalid"));
        assertErrors(withStatus("official"), Map.of("job.status", "invalid"));
    }

    @Test
    void textFieldsHaveTheirLimitsAndContactDetailsTheirFormat() {
        EmployeeCreateRequest request = new EmployeeCreateRequest("x".repeat(151),
                new EmployeePersonalRequest(LocalDate.of(1990, 1, 1), "OTHER", "not-an-email", "12345",
                        "x".repeat(501), new EmergencyContact("x".repeat(151), "x".repeat(51), "0912")),
                identity(CCCD, null, null),
                new EmployeeJobRequest(null, POSITION, null, LocalDate.of(2026, 11, 1), null));

        assertErrors(request, Map.of(
                "fullName", "too_long",
                "personal.gender", "invalid",
                "personal.personalEmail", "invalid",
                "personal.phone", "invalid",
                "personal.address", "too_long",
                "personal.emergencyContact.name", "too_long",
                "personal.emergencyContact.relationship", "too_long",
                "personal.emergencyContact.phone", "invalid"));
    }

    @Test
    void phoneNumbersAreStoredWithALeadingZero() {
        EmployeeFieldRules.Errors errors = new EmployeeFieldRules.Errors();

        assertThat(EmployeeFieldRules.phone("+84 912-345-678", "phone", errors)).isEqualTo("0912345678");
        assertThat(EmployeeFieldRules.phone("  ", "phone", errors)).isNull();
        assertThatCode(errors::throwIfAny).as("nothing failed so far").doesNotThrowAnyException();
        assertThat(EmployeeFieldRules.phone("+849123456789", "phone", errors)).isNull();
        assertThatThrownBy(errors::throwIfAny).isInstanceOf(ApiException.class);
    }

    // --- helpers ---

    private static EmployeeIdentityRequest identity(String idNumber, String taxCode, String socialInsuranceNumber) {
        return new EmployeeIdentityRequest(idNumber, null, null, taxCode, socialInsuranceNumber);
    }

    private static EmployeeCreateRequest request(EmployeeIdentityRequest identity) {
        return new EmployeeCreateRequest("Trần Thị Mai",
                new EmployeePersonalRequest(LocalDate.of(1994, 3, 12), "FEMALE", null, null, null, null),
                identity, new EmployeeJobRequest(null, POSITION, null, LocalDate.of(2026, 11, 1), null));
    }

    private static EmployeeCreateRequest withBirth(LocalDate dateOfBirth, LocalDate hireDate) {
        return new EmployeeCreateRequest("Trần Thị Mai",
                new EmployeePersonalRequest(dateOfBirth, "FEMALE", null, null, null, null),
                identity(CCCD, null, null), new EmployeeJobRequest(null, POSITION, null, hireDate, null));
    }

    private static EmployeeCreateRequest withStatus(String status) {
        return new EmployeeCreateRequest("Trần Thị Mai",
                new EmployeePersonalRequest(LocalDate.of(1994, 3, 12), "FEMALE", null, null, null, null),
                identity(CCCD, null, null), new EmployeeJobRequest(null, POSITION, null, LocalDate.of(2026, 11, 1),
                        status));
    }

    private static void assertErrors(EmployeeCreateRequest request, Map<String, String> expected) {
        assertThatThrownBy(() -> EmployeeFieldRules.check(request, TODAY))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(ex.getCode()).isEqualTo("validation.invalid");
                    @SuppressWarnings("unchecked")
                    List<Map<String, String>> errors = (List<Map<String, String>>) ex.getProperties().get("errors");
                    assertThat(errors).hasSize(expected.size());
                    for (Map<String, String> error : errors) {
                        assertThat(expected).containsEntry(error.get("field"), error.get("code"));
                    }
                });
    }
}
