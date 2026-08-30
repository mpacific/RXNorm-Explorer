// Keyset cursor: the sort field's value on the last row of the previous page,
// plus that row's id to break ties between equal values.
export type Cursor = {
  value: string;
  id: number;
};
