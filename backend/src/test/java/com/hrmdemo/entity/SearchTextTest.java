package com.hrmdemo.entity;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** One normalizer for what is stored and what is searched: lower case, no accents, single spaces. */
class SearchTextTest {

    @Test
    void vietnameseAccentsAreRemovedFromEveryVowel() {
        assertThat(SearchText.of("Trần Thị Mai")).isEqualTo("tran thi mai");
        assertThat(SearchText.of("Nguyễn Hữu Phước")).isEqualTo("nguyen huu phuoc");
        assertThat(SearchText.of("Ưu Ỷ Ỡ Ặ ẫ ệ ị")).isEqualTo("uu y o a a e i");
    }

    @Test
    void theLetterDWithStrokeBecomesD() {
        assertThat(SearchText.of("Đỗ Minh Quân")).isEqualTo("do minh quan");
        assertThat(SearchText.of("đặng")).isEqualTo("dang");
    }

    @Test
    void upperCaseBecomesLowerCase() {
        assertThat(SearchText.of("ĐẶNG NGỌC ÁNH")).isEqualTo("dang ngoc anh");
        assertThat(SearchText.of("Mai.Tran@HRM.Local")).isEqualTo("mai.tran@hrm.local");
    }

    @Test
    void composedAndDecomposedSpellingsGiveTheSameText() {
        // "ễ" as one character, and as "e" followed by a circumflex and a tilde.
        assertThat(SearchText.of("Nguyễn Văn A")).isEqualTo(SearchText.of("Nguyễn Văn A"))
                .isEqualTo("nguyen van a");
    }

    @Test
    void spacesAreTrimmedAndRunsOfWhitespaceBecomeOneSpace() {
        assertThat(SearchText.of("  Lê   Văn\tHùng \n")).isEqualTo("le van hung");
        assertThat(SearchText.of("Lê Văn Hùng")).as("no-break space").isEqualTo("le van hung");
        assertThat(SearchText.of("   ")).isEmpty();
    }

    @Test
    void partsAreJoinedByASpaceAndMissingPartsAreLeftOut() {
        assertThat(SearchText.of("Trần Thị Mai", "mai.tran@hrm.local"))
                .isEqualTo("tran thi mai mai.tran@hrm.local");
        assertThat(SearchText.of(null, "mai.tran@hrm.local")).isEqualTo("mai.tran@hrm.local");
        assertThat(SearchText.of(" ", "mai.tran@hrm.local")).isEqualTo("mai.tran@hrm.local");
    }

    @Test
    void aSearchTermBecomesAContainsPatternOfTheSameNormalizedText() {
        assertThat(SearchText.containsPattern(" TRẦN  thị ")).isEqualTo("%tran thi%");
    }

    @Test
    void likeWildcardsInASearchTermAreTakenLiterally() {
        assertThat(SearchText.containsPattern("50%_a\\b")).isEqualTo("%50\\%\\_a\\\\b%");
    }
}
