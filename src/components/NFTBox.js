import { useEffect, useMemo, useState } from "react"
import { $fetch } from "ohmyfetch"
import classNames from "classnames"

export default function NFTBox({ collection, onLoad, onChange }) {
  console.log('NFTBox', collection)
  const [nfts, setNFTs] = useState(null)
  const [current, setCurrent] = useState(0)

  const getNftInfo = async ({ address, tokenId }) => {
    const data = await $fetch(`https://testnets-api.opensea.io/api/v1/assets?asset_contract_address=${address}&token_ids=${tokenId}`)
    return data.assets[0]
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
      nfts.map((item, index) => {
        return <div
          key={item.id}
          className={classNames('nft-wrap', index === current ? 'selected' : '', nfts.length > 1 ? 'bordered' : '')}
          onClick={() => updateCur(index)}
        >
          <img className='nft-img' src={item.image_url} />
        </div>
      })
    }
  </div>
}
