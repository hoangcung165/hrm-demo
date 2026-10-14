// The heatmap cell that is open in the detail drawer: a person and the column's dates (not its index, so the
// drawer keeps its period when the table behind it pages or switches view).
export type CellSelection = { employeeId: string; from: string; to: string };
