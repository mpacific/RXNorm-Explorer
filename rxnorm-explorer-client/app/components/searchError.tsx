import { Typography } from "@mui/material"

export default function SearchError (props: {
  searchError: string
}) {
  return (
    <Typography><strong>Error while trying to fetch search results: </strong> {props.searchError}</Typography>
  )
}