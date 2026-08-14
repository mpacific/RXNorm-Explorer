import { Container, TextField } from "@mui/material"
import { useSearchParams, useRouter } from "next/navigation"

export default function SearchBox (props: {
  searchTerm: string
}) {
  const searchParams: URLSearchParams = useSearchParams()
  const params: {
    set: (key: string, value: string) => void
  } = new URLSearchParams(searchParams.toString())
  const router = useRouter()

  return (
    <div style={{
      paddingBottom: "2em"
    }}>
      <TextField 
        fullWidth 
        id="searchBox" 
        label="Search by drug name or RXCUI" 
        helperText="Hit enter to submit search" 
        variant="standard" 
        defaultValue={props.searchTerm} 
        onKeyUp={(e: React.KeyboardEvent<HTMLDivElement>) => { 
          const target = e.target as HTMLInputElement
          if (e.key === "Enter") {
            params.set('search', target.value || "")
            router.push(`/search?${params.toString()}`, { scroll: false })
          }
      }} />
    </div>
  )
}