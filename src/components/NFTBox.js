import { useEffect, useMemo, useState } from "react"
import classNames from "classnames"
import { alchemy } from 'connectors/alchemy'

export default function NFTBox({ collection, onLoad, onChange }) {
  const [nfts, setNFTs] = useState(null)
  const [current, setCurrent] = useState(0)

  const getNftInfo = async ({ address, tokenId }) => {
    const data = await alchemy.nft.getNftMetadata(address, tokenId)
    return data
  }

  const getNFTs = async () => {
    const data = await Promise.all(selectedNFT.map(getNftInfo))
    setNFTs(data)
    onLoad && onLoad(data)
  }

  const updateCur = (index) => {
    if (!nfts || nfts.length <= 1) {
      return
    }
    setCurrent(index)
    onChange && onChange(index)
  }

  const count = useMemo(() => {
    return collection.length === 1
    ? 1
    : collection.length <= 4
      ? 2
      : collection.length <= 9
        ? 3
        : 4
  }, [collection])

  const selectedNFT = useMemo(() => {
    return collection.map(_ => {
      return {
        address: _.contractAddress,
        tokenId: _.tokenId.toString(),
        count: Number(_.amount.toString()),
        tombstone: _.tombstone
      }
    })
  }, [collection])

  useEffect(() => {
    if (nfts || !selectedNFT.length) {
      return
    }

    getNFTs()
  }, [selectedNFT, nfts])

  if (!nfts || !nfts.length) {
    return <div className="nft-box">
      <div className='nft-box-shim'>
        Waiting to choose
      </div>
    </div>
  }

  return <div className={classNames('nft-box', `nft-box-c${count}`)}>
    {
      nfts.filter(_ => _).map((item, index) => {
        return <div
          key={item.contract.address + item.tokenId}
          className={classNames('nft-wrap', index === current ? 'selected' : '', nfts.length > 1 ? 'bordered' : '')}
          onClick={() => updateCur(index)}
        >
          <img className='nft-img' src={item.rawMetadata.image} />
        </div>
      })
    }
  </div>
}
