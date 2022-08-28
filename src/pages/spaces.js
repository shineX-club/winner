import { useWeb3React } from "@web3-react/core"
import { useEffect, useState } from "react"
import { contract } from "connectors/contract"
import Link from "next/link"

function GameItem({ item }) {
  console.log('item', item)
  return <>
    <div>
      <Link href={`/game/${item.id}`}>
        <a>
          Game {item.id}
        </a>
      </Link>
    </div>
  </>
}


export default function Spaces() {
  const { provider } = useWeb3React()
  const [pageState, setPageState] = useState({
    result: [],
    size: 12,
    page: 0,
    total: 0,
    error: null,
    noMore: false,
    nothing: false,
    loading: true,
  })

  const getTotal = async () => {
    try {
      console.log('getTotal')
      if (!provider || pageState.total) {
        return
      }

      const newContract = contract.connect(
        provider.getSigner()
      )
      const total = parseFloat((await newContract.getGamblingCount()).toString())
      console.log('total', total)
      setPageState({
        ...pageState,
        total,
        nothing: total === 0
      })
    } catch (err) {
      console.log('getTotal', err)
      setPageState({
        ...pageState,
        loading: false,
        error: err
      })
    }
  }

  const getGames = async () => {
    try {
      console.log('getGames')
      if (pageState.noMore || pageState.nothing) {
        return
      }
  
      setPageState({
        ...pageState,
        loading: true,
        error: null
      })
  
      const pageStart = pageState.result.length + 1
      const ids = new Array(pageState.size).fill(0).map((_, index) => {
        const result = pageStart + index
        return result > pageState.total ? 0 : result
      }).filter(_ => _)
      const getGameInfo = async (id) => {
        const newContract = contract.connect(provider.getSigner())
        return await newContract.getGamblingStatus(id)
      }
  
      let data = await Promise.all(ids.map(getGameInfo))
      data = data.map((item, index) => {
        return {
          id: ids[index],
          ...item
        }
      })
  
      setPageState({
        ...pageState,
        loading: false,
        result: pageState.result.concat(data),
        page: pageState.page++,
        noMore: (pageState.page + 1) * pageState.size >= pageState.total
      })
    } catch (err) {
      console.log(err)
      setPageState({
        ...pageState,
        loading: false,
        error: err
      })
    }
  }

  useEffect(() => {
    getTotal()
  }, [provider])

  useEffect(() => {
    if (pageState.total) {
      getGames()
    }
  }, [pageState.total])

  return <>
    <p>spaces</p>
    {
      pageState.result.map((item, index) => (<GameItem key={index} item={item} />))
    }
  </>
}
