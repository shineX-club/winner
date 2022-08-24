import { ethers } from 'ethers'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { contract, CONTRACT_ADDRESS } from 'connectors/contract'
import { useWeb3React } from '@web3-react/core'
import { $fetch } from 'ohmyfetch'

export default function Game() {
  const router = useRouter()
  const { id } = router.query
  const { account, provider } = useWeb3React()
  const [selected, setSelected] = useState([])
  const [value, setValue] = useState(0)

  const getGame = async () => {
    if (!provider || !account || !id) {
      return
    }

    console.log('id', id)
    const newContract = contract.connect(provider.getSigner())
    const result = await newContract.getGamblingStatus(id)
    console.log(result)

    const selectedNFTs = result.collections.map(_ => {
      return {
        address: _.contractAddress,
        tokenId: _.tokenId.toString(),
        count: Number(_.amount.toString())
      }
    })
    if (selectedNFTs.length) {
      const getSelectedNFT = async (address, token_id) => {
        const data = await $fetch(`https://testnets-api.opensea.io/api/v1/assets?asset_contract_address=${address}&token_ids=${token_id}`)
        return data.assets[0]
      }

      const selected = await Promise.all(selectedNFTs.map(_ => getSelectedNFT(_.address, _.tokenId)))
      setSelected(selected)
    }
  }

  const joinGame = async () => {
    console.log('value', ethers.utils.parseEther(value))
    const newContract = contract.connect(provider.getSigner())
    const tx = await newContract.joinGambling(id, {
      value: ethers.utils.parseEther(value)
    })

    console.log("tx", tx);

    const receipt = await tx.wait();
    console.log("receipt", receipt);
  }

  useEffect(() => {
    getGame()
  }, [provider, id])

  return <>
    <input value={value} type='text' onChange={(evt) => setValue(evt.target.value)}></input>
    <button className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" onClick={() => joinGame()}>Join</button>
    {
      selected.length && <div className='nft-container'>
        {
          selected.map(item => <div key={item.id} className='nft-wrap' onClick={() => withdrawNFT(item)}>
            <img className='nft-img' src={item.image_url} />
            <p className='nft-name'>{item.collection.name}：{item.name}</p>
          </div>)
        }
      </div>
    }
  </>
}
