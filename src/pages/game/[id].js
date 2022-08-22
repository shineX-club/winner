import { ethers } from 'ethers'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { contract, CONTRACT_ADDRESS } from 'connectors/contract'
import { useWeb3React } from '@web3-react/core'
import { $fetch } from 'ohmyfetch'
import { groupBy } from 'lodash-es'
import ERC721ABI from '../../../ABI-ERC721.json'

export default function Game() {
  const router = useRouter()
  const { id } = router.query
  const { account, provider } = useWeb3React()
  const [nfts, setNFTs] = useState(null)

  const getGame = async () => {
    if (!provider || !account || !id) {
      return
    }

    console.log('id', id)
    const newContract = contract.connect(provider.getSigner())
    const result = await newContract.getGamblingStatus(id)
    console.log(result)

    const allData = await getMyNFTs()
    setNFTs(groupBy(allData, (item) => item.asset_contract.address))
  }

  const getMyNFTs = async (result, cursor) => {
    result = result ?? []
    const data = await $fetch(`https://testnets-api.opensea.io/api/v1/assets?owner=${account}&limit=50&cursor=${cursor || ''}`)
    result = result.concat(data.assets)

    if (data.next) {
      result = await getMyNFTs(result, data.next)
    }

    return result
  }

  const appendNFT = async (nft) => {
    console.log('nft', nft)
    const contract = new ethers.Contract(nft.asset_contract.address, ERC721ABI)
    const newContract = contract.connect(provider.getSigner())
    const gameId = ethers.utils.hexZeroPad(ethers.utils.hexlify(Number(id)), 32)
    console.log('arguments', account, CONTRACT_ADDRESS, nft.token_id, gameId)
    const gas = await newContract.estimateGas["safeTransferFrom(address,address,uint256,bytes)"](account, CONTRACT_ADDRESS, nft.token_id, gameId)
    console.log('gas', gas)
    const tx = await newContract["safeTransferFrom(address,address,uint256,bytes)"](account, CONTRACT_ADDRESS, nft.token_id, gameId)
    console.log('tx', tx)
    const receipt = await tx.wait()
    console.log("receipt", receipt)
  }

  useEffect(() => {
    getGame()
  }, [provider, id])

  console.log(nfts)

  return <>
    {
      nfts && Object.keys(nfts).map(address => <div className='nft-container' key={address}>
        <p className='nft-title'>{nfts[address][0].collection.name}</p>
        <div className='nft-list'>
          {
            nfts[address].map(item => <div className='nft-wrap' key={item.id} onClick={() => appendNFT(item)}>
              <img className='nft-img' src={item.image_url} />
              <p className='nft-name'>{item.name}</p>
            </div>)
          }
        </div>
      </div>)
    }
  </>
}
