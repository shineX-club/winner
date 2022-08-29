import { ethers } from 'ethers'
import { Modal, ButtonToolbar, Button, Placeholder } from 'rsuite'
import { useState, useEffect } from 'react'
import { useWeb3React } from '@web3-react/core'
import { $fetch } from 'ohmyfetch'
import { groupBy } from 'lodash-es'
import { CONTRACT_ADDRESS } from 'connectors/contract'
import ERC721ABI from '../../ABI-ERC721.json'

export default function SelectNFTModal({ id, account, display, onClose }) {
  const { provider } = useWeb3React()
  const [nfts, setNFTs] = useState([])
  const [loadingList, setLoadingList] = useState({})
  const [selected, setSelected] = useState([])
  const [collapse, setCollapse] = useState(0)

  const handleClose = () => {
    onClose && onClose()
  };

  const initNFTs = async () => {
    try {
      const getMyNFTs = async (result, cursor) => {
        result = result ?? []
        const data = await $fetch(`https://testnets-api.opensea.io/api/v1/assets?owner=${account}&limit=50&cursor=${cursor || ''}`)
        result = result.concat(data.assets)
    
        if (data.next) {
          result = await getMyNFTs(result, data.next)
        }
    
        return result
      }
  
      const allData = (await getMyNFTs())
        .filter(_ => _.asset_contract.schema_name === 'ERC721')
        // .filter(_ => _.creator.config === 'verified')
  
      setNFTs(groupBy(allData, (item) => item.asset_contract.address))
    } catch (err) {
      console.log('initNFTs', err)
    }
  }

  const appendNFT = async (nft, collectionAddress) => {
    if (loadingList[nft.id]) {
      return
    }

    try {
      console.log('nft', nft)
      setLoadingList({
        ...loadingList,
        [nft.id]: true
      })
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
      const tempArr = nfts[collectionAddress]
      const index = tempArr.findIndex(_ => _.id === nft.id)
      tempArr.splice(index, 1)
      setNFTs({
        ...nfts,
        collectionAddress: tempArr
      })
      setSelected(selected.concat(nft))
    } catch (err) {
      console.log('appendNFT', err)
    } finally {
      setLoadingList({
        ...loadingList,
        [nft.id]: false
      })
    }
  }

  useEffect(() => {
    if (display && !nfts.length) {
      initNFTs()
    }
  }, [display])

  return <>
    <Modal size='full' open={display} onClose={handleClose}>
      <Modal.Header>
        <Modal.Title>Modal Title</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* <Placeholder.Paragraph /> */}
        <p>Support ERC721 Only, Support ETH(mainnet) Only</p>
        {
          selected.length && <div className='nft-container'>
            {
              selected.map(item => <div key={item.id} className='nft-wrap'>
                <img className='nft-img' src={item.image_url} />
                <p className='nft-name'>{item.collection.name}：{item.name}</p>
              </div>)
            }
          </div>
        }
        {
          nfts && Object.keys(nfts).map((address, index) => <div className='nft-container' key={address}>
            {
              nfts[address][0] && <p className='nft-title' onClick={() => setCollapse(collapse === index ? -1 : index)}>{nfts[address][0].collection.name}</p>
            }
            <div className='nft-list' style={{
              display: collapse === index ? 'flex' : 'none'
            }}>
              {
                nfts[address].map(item => <div className='nft-wrap' key={item.id} onClick={() => appendNFT(item, address)}>
                  <img className='nft-img' src={item.image_url} loading='lazy' />
                  <p className='nft-name'>{item.name}</p>
                  {
                    loadingList[item.id] && <div className='nft-mask' />
                  }
                </div>)
              }
            </div>
          </div>)
        }
      </Modal.Body>
    </Modal>
  </>
}
