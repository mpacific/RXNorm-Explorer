"use client";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { ReactElement, useState } from "react";

export default function Home() {
  const [currentPage, setCurrentPage] = useState(1)

  const getRXNONSOString = gql`
    query getRXNCONSO($page: Int!) {
      allRXNCONSO(page: $page) {
        id,
        RXCUI,
        TTY,
        STR
      }
    }
  `

  const { loading, error, data } = useQuery<{allRXNCONSO: {
    id: number,
    RXCUI: string,
    TTY: string,
    STR: string
  }[]}>(getRXNONSOString, {
    variables: {
      page: currentPage
    }
  })

  const dataRows: ReactElement[] = []
  if (data?.allRXNCONSO?.length) {
    for (const RXNCONSO of data?.allRXNCONSO) {
      dataRows.push((
        <tr key={RXNCONSO.id}>
          <td className="p-2">{RXNCONSO.STR}</td>
          <td className="p-2">{RXNCONSO.RXCUI}</td>
          <td className="p-2">{RXNCONSO.TTY}</td>
        </tr>
      ))
    }
  }

  return (
    <div>
      {loading && 
        <strong>Loading...</strong>
      }
      {error && 
        <strong>{error.message}</strong>
      }
      {dataRows.length > 0 &&
        <table className="table-auto">
          <thead>
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">RXCUI</th>
              <th className="p-2 text-left">TTY</th>
            </tr>
          </thead>
          <tbody>
            {dataRows}
          </tbody>
        </table>
      }
    </div>
  );
}
