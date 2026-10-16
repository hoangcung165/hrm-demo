package com.hrmdemo.service.leave;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.MonthDay;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hrmdemo.dto.leave.DayPart;
import com.hrmdemo.dto.leave.LeaveAccrual;
import com.hrmdemo.dto.leave.LeaveBalance;
import com.hrmdemo.dto.leave.LeaveDay;
import com.hrmdemo.dto.leave.LeaveDayKind;
import com.hrmdemo.dto.leave.LeavePay;
import com.hrmdemo.dto.leave.LeaveProblem;
import com.hrmdemo.dto.workschedule.WorkDayKind;
import com.hrmdemo.service.leave.LeavePolicyEngine.LeaveCheck;
import com.hrmdemo.service.leave.LeavePolicyEngine.LeaveContext;
import com.hrmdemo.service.leave.LeavePolicyEngine.LeaveDraft;
import com.hrmdemo.service.workschedule.WorkWeek;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * Chính sách phép by business case, worked by hand. Nguyễn Văn An was hired on 01/07/2022; today is 14/10/2026.
 * Phép năm: 12 days a year, +1 per 5 years, monthly, cut-off day 15, advance allowed. 24/11/2026 (a Tuesday) is the
 * holiday Ngày Văn hóa Việt Nam.
 */
class LeavePolicyEngineTest {

    static final UUID ANNUAL = UUID.randomUUID();
    static final UUID SICK = UUID.randomUUID();
    static final LocalDate TODAY = LocalDate.of(2026, 10, 14);
    static final LocalDate AN_HIRED = LocalDate.of(2022, 7, 1);
    static final Map<LocalDate, String> HOLIDAYS = Map.of(LocalDate.of(2026, 11, 24), "Ngày Văn hóa Việt Nam");

    /** Phép năm without Phép tồn: the cases of accrual, balance and check that do not involve it. */
    static LeaveRule annual(boolean advance) {
        return new LeaveRule(LocalDate.of(2000, 1, 1), LeavePay.COMPANY, true, false, true, new BigDecimal("12"), 5,
                LeaveAccrual.MONTHLY, 15, advance, null, null, null);
    }

    /** Phép năm as the company defaults give it: up to 5 days of last year's unused days until 31/03. */
    static LeaveRule annualWithCarryOver(boolean advance) {
        return new LeaveRule(LocalDate.of(2000, 1, 1), LeavePay.COMPANY, true, false, true, new BigDecimal("12"), 5,
                LeaveAccrual.MONTHLY, 15, advance, null, new BigDecimal("5"), MonthDay.of(3, 31));
    }

    static final LeaveRule SICK_RULE = new LeaveRule(LocalDate.of(2000, 1, 1), LeavePay.SOCIAL_INSURANCE, true, true,
            false, null, null, null, 15, false, null, null, null);

    static BigDecimal days(String value) {
        return new BigDecimal(value).setScale(2);
    }

    static LeaveSpan span(String start, DayPart startPart, String end, DayPart endPart) {
        return new LeaveSpan(LocalDate.parse(start), startPart, LocalDate.parse(end), endPart);
    }

    static LeaveSpan wholeDays(String start, String end) {
        return span(start, DayPart.FULL, end, DayPart.FULL);
    }

    /** Whole days held from {@code start} to {@code end}, working days only (Monday to Friday, no holiday). */
    static List<BookedDay> held(UUID type, String start, String end, boolean approved) {
        UUID request = UUID.randomUUID();
        List<BookedDay> booked = new ArrayList<>();
        for (LeaveDay day : LeavePolicyEngine.breakdown(wholeDays(start, end), WorkWeek.DEFAULT, HOLIDAYS)) {
            if (day.value().signum() > 0) {
                booked.add(new BookedDay(request, type, day.date(), true, true, day.value(), approved));
            }
        }
        return booked;
    }

    static BookedDay heldHalf(UUID type, String date, boolean morning, boolean approved) {
        return new BookedDay(UUID.randomUUID(), type, LocalDate.parse(date), morning, !morning, LeavePolicyEngine.HALF,
                approved);
    }

    static LeaveCheck check(LeaveRule rule, LeaveSpan span, List<BookedDay> booked) {
        return check(ANNUAL, List.of(rule), span, booked, 0, AN_HIRED);
    }

    static LeaveCheck check(UUID type, List<LeaveRule> history, LeaveSpan span, List<BookedDay> booked,
            int attachments, LocalDate hired) {
        return LeavePolicyEngine.check(new LeaveDraft(type, span, attachments, null),
                new LeaveContext(TODAY, hired, history, WorkWeek.DEFAULT, HOLIDAYS, booked));
    }

    static List<String> codes(LeaveCheck check) {
        return check.problems().stream().map(LeaveProblem::code).toList();
    }

    @Nested
    class Accrual {

        @Test
        void phepNamAccruesOneTwelfthOfTheEntitlementAtTheStartOfEachMonth() {
            // January to October 2026: 10 months of 12/12.
            var entitlement = LeavePolicyEngine.entitlement(List.of(annual(true)), AN_HIRED, 2026, TODAY);

            assertThat(entitlement.accrued()).isEqualTo(days("10.00"));
            assertThat(entitlement.entitled()).isEqualTo(days("12.00"));
        }

        @Test
        void onTheFirstDayOfAMonthThatMonthHasAccrued() {
            var first = LeavePolicyEngine.entitlement(List.of(annual(true)), AN_HIRED, 2026, LocalDate.of(2026, 3, 1));
            var lastOfFebruary = LeavePolicyEngine.entitlement(List.of(annual(true)), AN_HIRED, 2026,
                    LocalDate.of(2026, 2, 28));

            assertThat(first.accrued()).isEqualTo(days("3.00"));
            assertThat(lastOfFebruary.accrued()).isEqualTo(days("2.00"));
        }

        @ParameterizedTest(name = "hired {0}: {1} accrued by 14/10, {2} for the year")
        @CsvSource({
                // Hired on or before the cut-off day 15: March counts.
                "2026-03-10, 8.00, 10.00",
                "2026-03-15, 8.00, 10.00",
                // Hired after it: April is the first month.
                "2026-03-16, 7.00, 9.00",
                // Hired in a later month of the same year: nothing has accrued to today, the rest of the year counts.
                "2026-11-02, 0.00, 2.00",
                // Hired next year: nothing this year.
                "2027-01-04, 0.00, 0.00",
        })
        void aHireInTheMiddleOfAMonthCountsByTheCutOffDay(String hired, String accrued, String entitled) {
            var entitlement = LeavePolicyEngine.entitlement(List.of(annual(true)), LocalDate.parse(hired), 2026,
                    TODAY);

            assertThat(entitlement.accrued()).isEqualTo(days(accrued));
            assertThat(entitlement.entitled()).isEqualTo(days(entitled));
        }

        @Test
        void theCutOffDayIsConfigured() {
            LeaveRule late = new LeaveRule(LocalDate.of(2000, 1, 1), LeavePay.COMPANY, true, false, true,
                    new BigDecimal("12"), 5, LeaveAccrual.MONTHLY, 20, true, null, null, null);

            var entitlement = LeavePolicyEngine.entitlement(List.of(late), LocalDate.of(2026, 3, 16), 2026, TODAY);

            assertThat(entitlement.accrued()).isEqualTo(days("8.00"));
        }

        @Test
        void theEntitlementGrowsByOneDayPerFiveYearsFromTheMonthOfTheAnniversary() {
            // Hired 01/07/2021: five full years on 01/07/2026, so July to December earn 13/12, January to June 12/12.
            LocalDate hired = LocalDate.of(2021, 7, 1);

            var entitlement = LeavePolicyEngine.entitlement(List.of(annual(true)), hired, 2026, TODAY);

            assertThat(entitlement.entitled()).isEqualTo(days("12.50"));
            // (6 × 12 + 4 × 13) / 12
            assertThat(entitlement.accrued()).isEqualTo(days("10.33"));
            assertThat(LeavePolicyEngine.yearlyEntitlement(annual(true), hired, LocalDate.of(2026, 6, 30)))
                    .isEqualByComparingTo("12");
            assertThat(LeavePolicyEngine.yearlyEntitlement(annual(true), hired, LocalDate.of(2026, 7, 1)))
                    .isEqualByComparingTo("13");
            assertThat(LeavePolicyEngine.yearlyEntitlement(annual(true), LocalDate.of(2011, 1, 1),
                    LocalDate.of(2026, 1, 1))).isEqualByComparingTo("15");
        }

        @Test
        void aNewVersionOfThePolicyCountsFromTheMonthItStarts() {
            LeaveRule from2000 = annual(true);
            LeaveRule from2026July = new LeaveRule(LocalDate.of(2026, 7, 1), LeavePay.COMPANY, true, false, true,
                    new BigDecimal("14"), 5, LeaveAccrual.MONTHLY, 15, true, null, null, null);

            var entitlement = LeavePolicyEngine.entitlement(List.of(from2026July, from2000), AN_HIRED, 2026, TODAY);

            // (6 × 12 + 6 × 14) / 12 for the year, (6 × 12 + 4 × 14) / 12 to October.
            assertThat(entitlement.entitled()).isEqualTo(days("13.00"));
            assertThat(entitlement.accrued()).isEqualTo(days("10.67"));
        }

        @Test
        void aYearlyGrantGivesTheWholeYearOnFirstJanuary() {
            LeaveRule yearly = new LeaveRule(LocalDate.of(2000, 1, 1), LeavePay.COMPANY, true, false, true,
                    new BigDecimal("12"), null, LeaveAccrual.YEARLY, 15, false, null, null, null);

            assertThat(LeavePolicyEngine.entitlement(List.of(yearly), AN_HIRED, 2026, TODAY).accrued())
                    .isEqualTo(days("12.00"));
            assertThat(LeavePolicyEngine.entitlement(List.of(yearly), AN_HIRED, 2027, TODAY).accrued())
                    .isEqualTo(days("0.00"));
            // Prorated in the year of hire: hired 10/03, March to December.
            assertThat(LeavePolicyEngine.entitlement(List.of(yearly), LocalDate.of(2026, 3, 10), 2026, TODAY)
                    .accrued()).isEqualTo(days("10.00"));
        }
    }

    /**
     * Phép tồn: last year's unused Phép năm, up to 5 days, taken first by the days up to 31/03 and lost after it.
     * An has the whole 12 days of 2025 (hired in 2022, the seniority step is 5 years).
     */
    @Nested
    class PhepTon {

        static final LeaveRule RULE = annualWithCarryOver(false);

        LeaveBalance balance(String asOf, List<BookedDay> booked) {
            return LeavePolicyEngine.balance(ANNUAL, List.of(RULE), AN_HIRED, 2026, LocalDate.parse(asOf), booked);
        }

        @Test
        void theUnusedDaysOfLastYearBecomePhepTonUpToTheMaximum() {
            LeaveBalance balance = balance("2026-02-10", List.of());

            assertThat(balance.carryOver().granted()).isEqualTo(days("5.00"));
            assertThat(balance.carryOver().remaining()).isEqualTo(days("5.00"));
            assertThat(balance.carryOver().lost()).isEqualTo(days("0.00"));
            assertThat(balance.carryOver().expiresOn()).isEqualTo(LocalDate.of(2026, 3, 31));
            // The year's own days (2 months accrued) are shown apart from it, and Còn lại counts both.
            assertThat(balance.accrued()).isEqualTo(days("2.00"));
            assertThat(balance.remaining()).isEqualTo(days("7.00"));
        }

        @Test
        void onlyTheDaysLeftUnusedLastYearAreCarried() {
            // 9 working days taken in May 2025, after the Phép tồn of that year ended, leave 3 of 12.
            LeaveBalance balance = balance("2026-02-10", held(ANNUAL, "2025-05-05", "2025-05-15", true));

            assertThat(balance.carryOver().granted()).isEqualTo(days("3.00"));
        }

        @Test
        void nothingIsCarriedWhenLastYearWasTakenInAdvance() {
            // 14 working days in May 2025, two more than the year gives.
            LeaveBalance balance = balance("2026-02-10", held(ANNUAL, "2025-05-05", "2025-05-22", true));

            assertThat(balance.carryOver().granted()).isEqualTo(days("0.00"));
            assertThat(balance.remaining()).isEqualTo(days("2.00"));
        }

        @Test
        void aTypeWithoutCarryOverHasNone() {
            LeaveBalance balance = LeavePolicyEngine.balance(ANNUAL, List.of(annual(true)), AN_HIRED, 2026, TODAY,
                    List.of());

            assertThat(balance.carryOver()).isNull();
        }

        @Test
        void thereIsNoneForTheYearInTheYearOfHire() {
            LeaveBalance balance = LeavePolicyEngine.balance(ANNUAL, List.of(RULE), AN_HIRED, 2022, TODAY, List.of());

            assertThat(balance.carryOver()).isNull();
        }

        @Test
        void itIsGivenOnTheFirstOfJanuaryNotBefore() {
            LeaveBalance early = LeavePolicyEngine.balance(ANNUAL, List.of(RULE), AN_HIRED, 2027,
                    LocalDate.of(2026, 12, 20), List.of());
            LeaveBalance onTheFirst = LeavePolicyEngine.balance(ANNUAL, List.of(RULE), AN_HIRED, 2027,
                    LocalDate.of(2027, 1, 1), List.of());

            assertThat(early.carryOver()).isNull();
            assertThat(onTheFirst.carryOver().granted()).isEqualTo(days("5.00"));
        }

        @Test
        void daysUpToTheExpiryComeOffItBeforeTheYearsOwnDays() {
            // Four days in the first week of March, in October: Phép tồn covered them, the 10 accrued days are whole.
            LeaveBalance balance = balance("2026-10-14", held(ANNUAL, "2026-03-02", "2026-03-05", true));

            assertThat(balance.used()).isEqualTo(days("4.00"));
            assertThat(balance.carryOver().used()).isEqualTo(days("4.00"));
            assertThat(balance.remaining()).isEqualTo(days("10.00"));
        }

        @Test
        void waitingDaysComeOffItToo() {
            LeaveBalance balance = balance("2026-03-20", held(ANNUAL, "2026-03-23", "2026-03-24", false));

            assertThat(balance.carryOver().used()).isEqualTo(days("2.00"));
            assertThat(balance.carryOver().remaining()).isEqualTo(days("3.00"));
            assertThat(balance.remaining()).isEqualTo(days("6.00"));
        }

        @Test
        void aRequestAcrossTheExpiryTakesFromItOnlyUpToTheExpiry() {
            // Monday 30/03 to Thursday 02/04: two days before the expiry, two after.
            LeaveBalance balance = balance("2026-10-14", held(ANNUAL, "2026-03-30", "2026-04-02", true));

            assertThat(balance.carryOver().used()).isEqualTo(days("2.00"));
            assertThat(balance.carryOver().lost()).isEqualTo(days("3.00"));
            assertThat(balance.remaining()).isEqualTo(days("8.00"));
        }

        @Test
        void whatIsLeftIsLostAfterTheExpiry() {
            LeaveBalance onTheLastDay = balance("2026-03-31", List.of());
            LeaveBalance nextDay = balance("2026-04-01", List.of());

            assertThat(onTheLastDay.carryOver().remaining()).isEqualTo(days("5.00"));
            assertThat(onTheLastDay.remaining()).isEqualTo(days("8.00"));
            assertThat(nextDay.carryOver().remaining()).isEqualTo(days("0.00"));
            assertThat(nextDay.carryOver().lost()).isEqualTo(days("5.00"));
            assertThat(nextDay.remaining()).isEqualTo(days("4.00"));
        }

        @Test
        void daysAfterTheExpiryNeverTouchIt() {
            LeaveBalance balance = balance("2026-10-14", held(ANNUAL, "2026-04-06", "2026-04-08", true));

            assertThat(balance.carryOver().used()).isEqualTo(days("0.00"));
            assertThat(balance.carryOver().lost()).isEqualTo(days("5.00"));
            assertThat(balance.remaining()).isEqualTo(days("7.00"));
        }

        @Test
        void aLostPhepTonIsNotCarriedASecondTime() {
            // 12 working days in May 2026 use the whole year; the 5 days of Phép tồn were lost in April, so 2027 gets 0.
            LeaveBalance next = LeavePolicyEngine.balance(ANNUAL, List.of(RULE), AN_HIRED, 2027,
                    LocalDate.of(2027, 1, 5), held(ANNUAL, "2026-05-04", "2026-05-19", true));

            assertThat(next.carryOver().granted()).isEqualTo(days("0.00"));
        }

        @Test
        void aRequestBeforeTheExpiryMayUseItAndOneAfterMayNot() {
            LeaveContext february = new LeaveContext(LocalDate.of(2026, 2, 10), AN_HIRED, List.of(RULE),
                    WorkWeek.DEFAULT, HOLIDAYS, List.of());
            // 2 accrued days and 5 of Phép tồn: seven days to take, no advance.
            LeaveCheck seven = LeavePolicyEngine.check(new LeaveDraft(ANNUAL, wholeDays("2026-03-02", "2026-03-10"), 0,
                    null), february);
            LeaveCheck eight = LeavePolicyEngine.check(new LeaveDraft(ANNUAL, wholeDays("2026-03-02", "2026-03-11"), 0,
                    null), february);
            LeaveCheck afterTheExpiry = LeavePolicyEngine.check(new LeaveDraft(ANNUAL,
                    wholeDays("2026-04-06", "2026-04-09"), 0, null), february);

            assertThat(seven.total()).isEqualTo(days("7.00"));
            assertThat(seven.ok()).isTrue();
            assertThat(codes(eight)).containsExactly("leave.over_balance");
            assertThat(eight.problems().get(0).details()).containsEntry("over", days("1.00"));
            // Four days in April: Phép tồn is gone by then, so only the 2 accrued days are there.
            assertThat(codes(afterTheExpiry)).containsExactly("leave.over_balance");
            assertThat(afterTheExpiry.problems().get(0).details()).containsEntry("over", days("2.00"));
        }
    }

    @Nested
    class Balance {

        @Test
        void remainingIsAccruedMinusUsedMinusPendingAndTheAdvanceIsShownApart() {
            // The artboard: 10 accrued, 4 used, 1.5 pending, 4.5 remaining, 2 more as advance.
            List<BookedDay> booked = new ArrayList<>(held(ANNUAL, "2026-03-02", "2026-03-05", true));
            booked.add(heldHalf(ANNUAL, "2026-10-19", true, false));
            booked.addAll(held(ANNUAL, "2026-10-20", "2026-10-20", false));

            LeaveBalance balance = LeavePolicyEngine.balance(ANNUAL, List.of(annual(true)), AN_HIRED, 2026, TODAY,
                    booked);

            assertThat(balance.limited()).isTrue();
            assertThat(balance.accrued()).isEqualTo(days("10.00"));
            assertThat(balance.used()).isEqualTo(days("4.00"));
            assertThat(balance.pending()).isEqualTo(days("1.50"));
            assertThat(balance.remaining()).isEqualTo(days("4.50"));
            assertThat(balance.advanceAvailable()).isEqualTo(days("2.00"));
            assertThat(balance.available()).isEqualTo(days("6.50"));
        }

        @Test
        void afterAnAdvanceTheBalanceIsNegative() {
            // 11 days approved with 10 accrued.
            List<BookedDay> booked = held(ANNUAL, "2026-08-03", "2026-08-17", true);

            LeaveBalance balance = LeavePolicyEngine.balance(ANNUAL, List.of(annual(true)), AN_HIRED, 2026, TODAY,
                    booked);

            assertThat(balance.used()).isEqualTo(days("11.00"));
            assertThat(balance.remaining()).isEqualTo(days("-1.00"));
            assertThat(balance.advanceAvailable()).isEqualTo(days("1.00"));
            assertThat(balance.available()).isEqualTo(days("1.00"));
        }

        @Test
        void withoutAdvancesNothingIsAvailableBeyondWhatHasAccrued() {
            LeaveBalance balance = LeavePolicyEngine.balance(ANNUAL, List.of(annual(false)), AN_HIRED, 2026, TODAY,
                    held(ANNUAL, "2026-03-02", "2026-03-05", true));

            assertThat(balance.remaining()).isEqualTo(days("6.00"));
            assertThat(balance.advanceAvailable()).isEqualTo(days("0.00"));
            assertThat(balance.available()).isEqualTo(days("6.00"));
        }

        @Test
        void otherTypesAndOtherYearsDoNotCount() {
            List<BookedDay> booked = new ArrayList<>(held(SICK, "2026-05-04", "2026-05-08", true));
            booked.addAll(held(ANNUAL, "2025-12-29", "2025-12-31", true));

            LeaveBalance balance = LeavePolicyEngine.balance(ANNUAL, List.of(annual(true)), AN_HIRED, 2026, TODAY,
                    booked);

            assertThat(balance.used()).isEqualTo(days("0.00"));
            assertThat(balance.remaining()).isEqualTo(days("10.00"));
        }

        @Test
        void anUnlimitedTypeHasOnlyUsedAndPending() {
            LeaveBalance balance = LeavePolicyEngine.balance(SICK, List.of(SICK_RULE), AN_HIRED, 2026, TODAY,
                    held(SICK, "2026-05-04", "2026-05-08", true));

            assertThat(balance.limited()).isFalse();
            assertThat(balance.used()).isEqualTo(days("5.00"));
            assertThat(balance.remaining()).isNull();
            assertThat(balance.available()).isNull();
        }

        @Test
        void cancellingAnApprovedRequestGivesItsDaysBack() {
            List<BookedDay> approved = held(ANNUAL, "2026-11-02", "2026-11-04", true);
            LeaveBalance before = LeavePolicyEngine.balance(ANNUAL, List.of(annual(true)), AN_HIRED, 2026, TODAY,
                    approved);

            // A cancelled request holds no day any more.
            LeaveBalance after = LeavePolicyEngine.balance(ANNUAL, List.of(annual(true)), AN_HIRED, 2026, TODAY,
                    List.of());

            assertThat(before.remaining()).isEqualTo(days("7.00"));
            assertThat(after.remaining()).isEqualTo(days("10.00"));
        }
    }

    @Nested
    class Days {

        @Test
        void aHalfDayCountsHalf() {
            LeaveCheck morning = check(annual(true), span("2026-10-21", DayPart.MORNING, "2026-10-21", DayPart.MORNING),
                    List.of());
            LeaveCheck afternoon = check(annual(true),
                    span("2026-10-21", DayPart.AFTERNOON, "2026-10-21", DayPart.AFTERNOON), List.of());

            assertThat(morning.total()).isEqualTo(days("0.50"));
            assertThat(morning.days()).singleElement().satisfies(day -> {
                assertThat(day.morning()).isTrue();
                assertThat(day.afternoon()).isFalse();
            });
            assertThat(afternoon.total()).isEqualTo(days("0.50"));
            assertThat(morning.ok()).isTrue();
        }

        @Test
        void severalDaysMayStartInTheAfternoonAndEndAtNoon() {
            // Thursday afternoon to Monday morning: 0.5 + 1 + 0 + 0 + 0.5.
            LeaveCheck check = check(annual(true),
                    span("2026-10-22", DayPart.AFTERNOON, "2026-10-26", DayPart.MORNING), List.of());

            assertThat(check.days()).extracting(LeaveDay::value)
                    .containsExactly(days("0.50"), days("1.00"), days("0.00"), days("0.00"), days("0.50"));
            assertThat(check.total()).isEqualTo(days("2.00"));
        }

        @Test
        void aRequestAcrossAWeekendAndAHolidayCountsOnlyTheWorkingDays() {
            // Friday 20/11 to Wednesday 25/11: Fri 1, Sat 0, Sun 0, Mon 1, Tue 24/11 holiday 0, Wed 1.
            LeaveCheck check = check(annual(true), wholeDays("2026-11-20", "2026-11-25"), List.of());

            assertThat(check.days()).extracting(LeaveDay::kind).containsExactly(LeaveDayKind.WORKING,
                    LeaveDayKind.DAY_OFF, LeaveDayKind.DAY_OFF, LeaveDayKind.WORKING, LeaveDayKind.HOLIDAY,
                    LeaveDayKind.WORKING);
            assertThat(check.days().get(4).holidayName()).isEqualTo("Ngày Văn hóa Việt Nam");
            assertThat(check.total()).isEqualTo(days("3.00"));
        }

        @Test
        void aSaturdayMorningOfTheLichLamViecCountsHalf() {
            EnumMap<DayOfWeek, WorkDayKind> days = new EnumMap<>(WorkWeek.DEFAULT.days());
            days.put(DayOfWeek.SATURDAY, WorkDayKind.MORNING);
            WorkWeek withSaturdayMorning = new WorkWeek(days);

            List<LeaveDay> saturday = LeavePolicyEngine.breakdown(wholeDays("2026-06-06", "2026-06-06"),
                    withSaturdayMorning, Map.of());
            List<LeaveDay> afternoon = LeavePolicyEngine.breakdown(
                    span("2026-06-06", DayPart.AFTERNOON, "2026-06-06", DayPart.AFTERNOON), withSaturdayMorning,
                    Map.of());

            assertThat(saturday).singleElement().extracting(LeaveDay::value).isEqualTo(days("0.50"));
            assertThat(afternoon).singleElement().extracting(LeaveDay::value).isEqualTo(days("0.00"));
        }

        @Test
        void onlyDaysOffAndHolidaysIsRefused() {
            LeaveCheck weekend = check(annual(true), wholeDays("2026-11-21", "2026-11-22"), List.of());

            assertThat(codes(weekend)).containsExactly("leave.no_working_day");
        }

        @ParameterizedTest(name = "{0} {1} → {2} {3}: {4}")
        @CsvSource({
                "2026-10-22, FULL, 2026-10-21, FULL, leave.invalid_dates",
                "2026-10-21, MORNING, 2026-10-22, FULL, leave.invalid_part",
                "2026-10-21, FULL, 2026-10-22, AFTERNOON, leave.invalid_part",
                "2026-10-21, MORNING, 2026-10-21, AFTERNOON, leave.invalid_part",
                "2026-01-01, FULL, 2027-01-02, FULL, leave.range_too_long",
        })
        void wrongDatesOrDayPartsAreRefusedBeforeAnythingIsCounted(String start, DayPart startPart, String end,
                DayPart endPart, String code) {
            LeaveCheck check = check(annual(true), span(start, startPart, end, endPart), List.of());

            assertThat(codes(check)).containsExactly(code);
            assertThat(check.days()).isEmpty();
            assertThat(check.balance()).isNull();
        }

        @Test
        void aTypeOfWholeDaysRefusesHalfDays() {
            LeaveRule wholeOnly = new LeaveRule(LocalDate.of(2000, 1, 1), LeavePay.SOCIAL_INSURANCE, false, false,
                    false, null, null, null, 15, false, null, null, null);

            LeaveCheck check = check(SICK, List.of(wholeOnly),
                    span("2026-10-21", DayPart.MORNING, "2026-10-21", DayPart.MORNING), List.of(), 0, AN_HIRED);

            assertThat(codes(check)).containsExactly("leave.half_day_not_allowed");
            assertThat(check.total()).isEqualTo(days("0.50"));
        }
    }

    @Nested
    class Requests {

        @Test
        void aRequestOverTheBalanceIsRefusedWithTheNumbers() {
            // 4.5 remaining and 2 in advance: 7 days is 0.5 too many.
            List<BookedDay> booked = new ArrayList<>(held(ANNUAL, "2026-03-02", "2026-03-05", true));
            booked.addAll(held(ANNUAL, "2026-10-19", "2026-10-19", false));
            booked.add(heldHalf(ANNUAL, "2026-10-20", true, false));

            LeaveCheck check = check(annual(true), wholeDays("2026-11-02", "2026-11-10"), booked);

            assertThat(codes(check)).containsExactly("leave.over_balance");
            assertThat(check.problems().get(0).details()).containsEntry("requested", days("7.00"))
                    .containsEntry("remaining", days("4.50")).containsEntry("advanceAvailable", days("2.00"))
                    .containsEntry("available", days("6.50")).containsEntry("over", days("0.50"))
                    .containsEntry("year", 2026);
        }

        @Test
        void aRequestUsingTheAdvanceIsAllowedAndLeavesANegativeBalance() {
            LeaveCheck check = check(annual(true), wholeDays("2026-11-02", "2026-11-11"),
                    held(ANNUAL, "2026-03-02", "2026-03-05", true));

            // 10 accrued − 4 used = 6 remaining; 8 more days leave −2, within the 12 of the year.
            assertThat(check.ok()).isTrue();
            assertThat(check.total()).isEqualTo(days("8.00"));
            assertThat(check.balance().remaining()).isEqualTo(days("6.00"));
            assertThat(check.remainingAfter()).isEqualTo(days("-2.00"));
        }

        @Test
        void withoutAdvancesTheSameRequestIsOverTheBalance() {
            LeaveCheck check = check(annual(false), wholeDays("2026-11-02", "2026-11-11"),
                    held(ANNUAL, "2026-03-02", "2026-03-05", true));

            assertThat(codes(check)).containsExactly("leave.over_balance");
        }

        @Test
        void anUnlimitedTypeIsNeverOverTheBalance() {
            LeaveCheck check = check(SICK, List.of(SICK_RULE), wholeDays("2026-11-02", "2026-12-31"), List.of(), 1,
                    AN_HIRED);

            assertThat(check.ok()).isTrue();
            assertThat(check.remainingAfter()).isNull();
        }

        @Test
        void aRequestAcrossNewYearTakesFromEachYearsBalance() {
            // 30/12/2026 to 01/01/2027 as a holiday-free stretch: 2 days in 2026, 1 in 2027. In 2027 nothing has
            // accrued yet, but the advance allows the whole year.
            LeaveCheck check = check(annual(true), wholeDays("2026-12-30", "2027-01-01"), List.of());
            LeaveCheck withoutAdvance = check(annual(false), wholeDays("2026-12-30", "2027-01-01"), List.of());

            assertThat(check.ok()).isTrue();
            assertThat(codes(withoutAdvance)).containsExactly("leave.over_balance");
            assertThat(withoutAdvance.problems().get(0).details()).containsEntry("year", 2027)
                    .containsEntry("requested", days("1.00"));
        }

        @Test
        void anotherRequestOnTheSameHalfDayIsAnOverlap() {
            List<BookedDay> morningTaken = List.of(heldHalf(ANNUAL, "2026-10-21", true, false));

            LeaveCheck afternoon = check(annual(true),
                    span("2026-10-21", DayPart.AFTERNOON, "2026-10-21", DayPart.AFTERNOON), morningTaken);
            LeaveCheck wholeDays = check(annual(true), wholeDays("2026-10-20", "2026-10-22"), morningTaken);

            assertThat(afternoon.ok()).isTrue();
            assertThat(codes(wholeDays)).containsExactly("leave.overlap");
            assertThat(wholeDays.problems().get(0).details()).containsEntry("dates", List.of("2026-10-21"));
        }

        @Test
        void aRequestBeingEditedDoesNotOverlapOrHoldItsOwnDays() {
            List<BookedDay> own = held(ANNUAL, "2026-11-02", "2026-11-06", false);
            UUID ownId = own.get(0).requestId();

            LeaveCheck edited = LeavePolicyEngine.check(
                    new LeaveDraft(ANNUAL, wholeDays("2026-11-02", "2026-11-09"), 0, ownId),
                    new LeaveContext(TODAY, AN_HIRED, List.of(annual(true)), WorkWeek.DEFAULT, HOLIDAYS, own));

            assertThat(edited.ok()).isTrue();
            assertThat(edited.balance().pending()).isEqualTo(days("0.00"));
        }

        @Test
        void aTypeThatNeedsAFileIsRefusedWithoutOne() {
            assertThat(codes(check(SICK, List.of(SICK_RULE), wholeDays("2026-10-21", "2026-10-21"), List.of(), 0,
                    AN_HIRED))).containsExactly("leave.attachment_required");
            assertThat(check(SICK, List.of(SICK_RULE), wholeDays("2026-10-21", "2026-10-21"), List.of(), 1,
                    AN_HIRED).ok()).isTrue();
        }

        @Test
        void aTypeWithAMaximumPerRequestRefusesMore() {
            // Việc riêng có lương: kết hôn, 3 days.
            LeaveRule personal = new LeaveRule(LocalDate.of(2000, 1, 1), LeavePay.COMPANY, true, false, false, null,
                    null, null, 15, false, new BigDecimal("3"), null, null);

            LeaveCheck four = check(SICK, List.of(personal), wholeDays("2026-10-19", "2026-10-22"), List.of(), 0,
                    AN_HIRED);
            LeaveCheck three = check(SICK, List.of(personal), wholeDays("2026-10-19", "2026-10-21"), List.of(), 0,
                    AN_HIRED);

            assertThat(codes(four)).containsExactly("leave.over_max_per_request");
            assertThat(three.ok()).isTrue();
        }

        @Test
        void leaveBeforeTheHireDateIsRefused() {
            LeaveCheck check = check(ANNUAL, List.of(annual(true)), wholeDays("2026-03-02", "2026-03-02"), List.of(),
                    0, LocalDate.of(2026, 3, 10));

            assertThat(codes(check)).contains("leave.before_hire");
        }

        @Test
        void theVersionInForceOnTheFirstDayDecides() {
            LeaveRule old = new LeaveRule(LocalDate.of(2000, 1, 1), LeavePay.SOCIAL_INSURANCE, true, false, false,
                    null, null, null, 15, false, null, null, null);
            LeaveRule fromNovember = new LeaveRule(LocalDate.of(2026, 11, 1), LeavePay.SOCIAL_INSURANCE, true, true,
                    false, null, null, null, 15, false, null, null, null);

            assertThat(check(SICK, List.of(old, fromNovember), wholeDays("2026-10-30", "2026-10-30"), List.of(), 0,
                    AN_HIRED).ok()).isTrue();
            assertThat(codes(check(SICK, List.of(old, fromNovember), wholeDays("2026-11-02", "2026-11-02"), List.of(),
                    0, AN_HIRED))).containsExactly("leave.attachment_required");
        }
    }
}
