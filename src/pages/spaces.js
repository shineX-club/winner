import { useWeb3React } from "@web3-react/core"
import { useState } from "react"
import { contract } from "connectors/contract"
import FlowList from '@flowlist/react-flowlist'
import { Progress } from 'rsuite'
import { $fetch } from "ohmyfetch"
import { ethers } from 'ethers'
import Image from 'next/image'
import NFTBox from '@/components/NFTBox'
import Link from "next/link"

export const convertAddress = (address, pre = 6, sub = 4) => {
  return address.slice(0, pre) + '...' + address.slice(-sub)
}

function GameLoader() {
  return <div className="game-item-loader">
    <div className="game-image"></div>
    <div className="game-name"></div>
    <div className="game-desc"></div>
    <div className="game-footer">
      <div className="game-avatar"></div>
      <div className="game-address"></div>
    </div>
  </div>
}

function GameItem({ item }) {
  console.log('item', item)
  return <div className="game-flow-item">
    <Link href={`/game/${item.id}`}>
      <a>
        <NFTBox item={item.nft}></NFTBox>
        <div className='name-line'>
          <span>{item.nft.name}</span>
          <div>
            <Image width='15' height='16' src='/img/usage/eth.png'></Image>
            <span>{ethers.utils.formatEther(item.record.config.minCounterpartyBid.toString())}</span>
          </div>
        </div>
        <Progress.Line
          percent={item.fundraisingAmount.toString() / item.record.config.minFundraisingAmount.toString() * 100}
          showInfo={false}
          strokeWidth={17}
        />
        <div className='foot-line'>
          <div>
            <Image width='18' height='18' src='/img/usage/user.png'></Image>
            &nbsp;
            <span>{convertAddress(item?.record?.creator)}</span>
          </div>
        </div>
      </a>
    </Link>
  </div>
}


export default function Spaces() {
  const { provider } = useWeb3React()
  const [pageState, setPageState] = useState({
    size: 12,
    page: 0,
    total: 0,
    fetched: false
  })

  const getTotal = () => new Promise(async (resolve) => {
    try {
      console.log('getTotal')
      if (pageState.total || pageState.fetched) {
        return resolve(pageState.total)
      }

      const newContract = contract.connect(
        provider.getSigner()
      )

      const total = parseFloat((await newContract.getGamblingCount()).toString())
      console.log('total', total)
      setPageState({
        ...pageState,
        total,
        fetched: true
      })
      resolve(total)
    } catch (err) {
      console.log('getTotal', err)
      resolve(pageState.total)
    }
  })

  const getNftInfo = async ({ address, tokenId }) => {
    const data = await $fetch(`https://testnets-api.opensea.io/api/v1/assets?asset_contract_address=${address}&token_ids=${tokenId}`)
    return data.assets[0]
  }

  const getPostData = () => new Promise(async (resolve, reject) => {
    try {
      console.log('getPostData')
      const total = await getTotal()
      const start = pageState.size * pageState.page + 1

      const ids = new Array(pageState.size).fill(0).map((_, index) => {
        const result = start + index
        return result > total ? 0 : result
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

      const nfts = await Promise.all(data.map(_ => {
        if (!_.collections[0]) {
          return null
        }
        return getNftInfo({
          address: _.collections[0].contractAddress,
          tokenId: _.collections[0].tokenId.toString()
        })
      }))
      console.log('nfts', nfts)
      data = data.map((item, index) => {
        return {
          ...item,
          nft: nfts[index]
        }
      }).filter(_ => _.nft)

      setPageState({
        ...pageState,
        page: pageState.page++,
      })

      resolve({
        result: data,
        noMore: (start - 1) + pageState.size >= total,
        total
      })
    } catch (err) {
      console.log('getPostData', err)
      reject(err)
    }
  })

  return <div className="spaces-container">
    <img src='/img/usage/banner.png'></img>
    {
      provider ? <FlowList
        func={getPostData}
        mainSlot={(({ result }) => {
          return result.map((item) => {
            return <GameItem item={item} key={item.id}></GameItem>
          })
        })}
        firstloadingSlot={() => {
          return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(item => {
            return <GameLoader key={item}></GameLoader>
          })
        }}
        nothingSlot={() => {
          return <div className="error-tips">please create trading first</div>
        }}
        loadingSlot={() => {
          return <>
            loading
          </>
        }}
        firstErrorSlot={(err) => {
          return <div className="error-tips">Ops...{err?.message}</div>
        }}
      ></FlowList> : <div className="error-tips">please connect your wallet first</div>
    }
  </div>
}
