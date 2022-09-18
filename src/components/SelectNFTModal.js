import { ethers } from 'ethers'
import { Modal } from 'rsuite'
import { useState, useEffect } from 'react'
import { useWeb3React } from '@web3-react/core'
import { groupBy } from 'lodash-es'
import { CONTRACT_ADDRESS } from 'connectors/contract'
import ERC721ABI from '../../ABI-ERC721.json'
import { alchemy } from 'connectors/alchemy'

export default function SelectNFTModal({ id, account, display, onClose, selectedNFT }) {
  const { provider } = useWeb3React()
  const [nfts, setNFTs] = useState([])
  const [loadingList, setLoadingList] = useState({})
  const [selected, setSelected] = useState([])
  const [collapse, setCollapse] = useState(-1)

  const handleClose = () => {
    onClose && onClose()
  };

  const initNFTs = async () => {
    try {
      const getMyNFTs = async (result, pageKey) => {
        result = result ?? []
        const data = await alchemy.nft.getNftsForOwner(account, {
          pageKey,
          withMetadata: false
        })
        result = result.concat(data.ownedNfts)
    
        if (data.pageKey) {
          result = await getMyNFTs(result, data.pageKey)
        }
    
        return result
      }
  
      const allData = (await getMyNFTs())
        .filter(_ => _.tokenType === 'ERC721')

      setNFTs(groupBy(allData, (item) => item.contract.address))
    } catch (err) {
      console.log('initNFTs', err)
    }
  }

  const appendNFT = async (nft, collectionAddress) => {
    if (loadingList[collectionAddress + nft.tokenId]) {
      return
    }

    try {
      console.log('nft', nft)
      setLoadingList({
        ...loadingList,
        [collectionAddress + nft.tokenId]: true
      })
      const contract = new ethers.Contract(collectionAddress, ERC721ABI)
      const newContract = contract.connect(provider.getSigner())
      const gameId = ethers.utils.hexZeroPad(ethers.utils.hexlify(Number(id)), 32)
      console.log('arguments', account, CONTRACT_ADDRESS, nft.tokenId, gameId)
      const gas = await newContract.estimateGas["safeTransferFrom(address,address,uint256,bytes)"](account, CONTRACT_ADDRESS, nft.tokenId, gameId)
      console.log('gas', gas)
      const tx = await newContract["safeTransferFrom(address,address,uint256,bytes)"](account, CONTRACT_ADDRESS, nft.tokenId, gameId)
      console.log('tx', tx)
      const receipt = await tx.wait()
      console.log("receipt", receipt)
      const tempArr = nfts[collectionAddress]
      const index = tempArr.findIndex(_ => _.tokenId === nft.tokenId)
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
        [collectionAddress + nft.tokenId]: false
      })
    }
  }

  useEffect(() => {
    setSelected([...selectedNFT, ...selected])
  }, [selectedNFT])

  useEffect(() => {
    if (display && !nfts.length) {
      initNFTs()
    }
  }, [display])

  return <>
    <Modal size='full' open={display} onClose={handleClose}>
      <Modal.Header>
        <Modal.Title>Choose NFT</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className='choose-container'>
          <p className='nft-title'>Support ERC721 Only</p>
          {
            selected.length !== 0 ? <div className='nft-container'>
              <div className='nft-list'>
              {
                selected.map(item => <div key={item.contract.address + item.tokenId} className='nft-wrap'>
                  <img className='nft-img' src={item.rawMetadata.image} />
                  <p className='nft-name'>{item.rawMetadata.name}</p>
                </div>)
              }
              </div>
            </div> : <div className='nochoose-nft'>
              please select NFT first!
            </div>
          }
          {
            nfts && Object.keys(nfts).map((address, index) => <div className='nft-container' key={address}>
              <p className='nft-title' onClick={() => setCollapse(collapse === index ? -1 : index)}>{address}</p>
              <div className='nft-list' style={{
                display: collapse === index ? 'flex' : 'none'
              }}>
                {
                  nfts[address].map(item => <div className='nft-wrap' key={address + item.tokenId} onClick={() => appendNFT(item, address)}>
                    <img className='nft-img' src={item.rawMetadata.image} crossOrigin="anonymous" loading='lazy' />
                    <p className='nft-name'>{item.rawMetadata.name}</p>
                    {
                      loadingList[address + item.tokenId] && <div className='nft-mask' />
                    }
                  </div>)
                }
              </div>
            </div>)
          }
        </div>
      </Modal.Body>
    </Modal>
  </>
}
