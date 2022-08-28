import { ethers } from 'ethers'
import { useRouter } from 'next/router'
import { useEffect, useState, useMemo } from 'react'
import { contract, CONTRACT_ADDRESS } from 'connectors/contract'
import { useWeb3React } from '@web3-react/core'
import { $fetch } from 'ohmyfetch'
import { Button } from 'rsuite'
import SelectNFTModal from '@/components/SelectNFTModal'
import { toast } from 'react-toastify'

export default function Game() {
  const router = useRouter()
  const { id, from } = router.query
  const { account, provider } = useWeb3React()
  const [selected, setSelected] = useState([])
  const [game, setGame] = useState(null)
  const [config, setConfig] = useState(null)
  const [value, setValue] = useState(0)
  const [myBid, setMyBid] = useState(0)
  const [showSelect, setShowSelect] = useState(false)
  const [usePlaceholder, setPlaceholder] = useState(true)

  const getGame = async () => {
    if (!provider || !account || !id || game) {
      return
    }

    console.log('id', id)
    const newContract = contract.connect(provider.getSigner())
    let result = await newContract.getGamblingStatus(id)
    setConfig({
      minCounterpartyBid: parseFloat(result.record.config.minCounterpartyBid.toString()),
      maxCounterpartyBid: parseFloat(result.record.config.maxCounterpartyBid.toString()),
      minFundraisingAmount: parseFloat(result.record.config.minFundraisingAmount.toString()),
      initiatorWinProbability: parseFloat(result.record.config.initiatorWinProbability.toString()),
      chainRandomMode: result.record.config.chainRandomMode,
      fundraisingStartTime: result.record.config.fundraisingStartTime.toString() * 1000,
      deadline: result.record.config.deadline.toString() * 1000,
      initiatorWinProbability: result.record.config.initiatorWinProbability
    })
    setGame(result)
    console.log('game', result)
    const selectedNFTs = result.collections.map(_ => {
      return {
        address: _.contractAddress,
        tokenId: _.tokenId.toString(),
        count: Number(_.amount.toString()),
        tombstone: _.tombstone
      }
    })

    if (selectedNFTs.length) {
      const getSelectedNFT = async ({ address, tokenId, tombstone }) => {
        const data = await $fetch(`https://testnets-api.opensea.io/api/v1/assets?asset_contract_address=${address}&token_ids=${tokenId}`)
        data.assets[0].tombstone = tombstone
        return data.assets[0]
      }

      const selected = await Promise.all(selectedNFTs.map(getSelectedNFT))
      setSelected(selected)
    }
  }

  const getMyBid = async () => {
    if (!provider || !account || !id) {
      return
    }
    const newContract = contract.connect(provider.getSigner())
    const result = await newContract.getETHItem(id, account)
    setMyBid(parseFloat(result.toString()))
  }

  const joinGame = async () => {
    if (!gameJoinable) {
      toast('现在不能加入游戏')
      return
    }
    const numVal = parseFloat(value)
    if (numVal <= 0) {
      toast('不能小于0')
      return
    }
    if (numVal < config.minCounterpartyBid) {

    }
    console.log('value', ethers.utils.parseEther(value))
    const newContract = contract.connect(provider.getSigner())
    const tx = await newContract.joinGambling(id, {
      value: ethers.utils.parseEther(value)
    })

    console.log("tx", tx);

    const receipt = await tx.wait();
    console.log("receipt", receipt);
  }

  const playGame = async () => {
    if (!gamePlayable) {
      toast('现在不能开启游戏')
      return
    }
    const newContract = contract.connect(provider.getSigner())

    let tx
    if (config.chainRandomMode) {
      tx = await newContract.playGambling(id)
    } else {
      const randomFee = await newContract.gammblingFee()
      console.log('randomFee', randomFee)
      tx = await newContract.playGambling(id, {
        value: randomFee
      })
    }

    console.log("tx", tx);

    const receipt = await tx.wait();
    console.log("receipt", receipt);
  }

  const claimAllNFT = async () => {
    if (!selected.filter(_ => !_.tombstone).length) {
      toast('已经全部 claim 了')
      return
    }

    const newContract = contract.connect(provider.getSigner())
    const tx = await newContract.claimGamblingNFTs(id)

    console.log("tx", tx);

    const receipt = await tx.wait();
    console.log("receipt", receipt);
  }

  const claimETH = async () => {
    if (gameStatus !== 'ended') {
      toast('游戏结束后可以提币')
      return
    }
    const newContract = contract.connect(provider.getSigner())
    const tx = await newContract.claimGamblingETH(id)

    console.log("tx", tx);

    const receipt = await tx.wait();
    console.log("receipt", receipt);
  }

  const isOwner = useMemo(() => {
    return id && account && game && account === game.record.creator
  }, [id, account, game])

  const gameStatus = useMemo(() => {
    if (!game) {
      return ''
    }

    if (config.fundraisingStartTime > Date.now()) {
      return 'waiting'
    }

    if (config.deadline < Date.now()) {
      return 'closed'
    }

    return game.record.winner === '0x0000000000000000000000000000000000000000' ? 'open' : 'ended'
  }, [game])

  const canAppendNFT = useMemo(() => {
    return isOwner && gameStatus && gameStatus !== 'ended' && gameStatus !== 'closed'
  }, [isOwner, gameStatus])

  const gamePlayable = useMemo(() => {
    return gameStatus === 'open'
  }, [gameStatus])

  const gameJoinable = useMemo(() => {
    return !!selected.length && gameStatus === 'open'
  }, [gameStatus, selected])

  const canClaimAllNFT = useMemo(() => {
    return game && game.record.winner === account
  }, [game, account])

  const canClaimETH = useMemo(() => {
    return myBid > 0
  }, [myBid])

  useEffect(() => {
    getGame()
    getMyBid()
  }, [provider, account, id])

  useEffect(() => {
    setPlaceholder(!id || !provider || !account || !game)
  }, [provider, account, id, game])

  useEffect(() => {
    if (from === 'create') {
      setShowSelect(true)
    }
  }, [from])

  console.log('isOwner', isOwner)
  console.log('gameStatus', gameStatus)

  if (usePlaceholder) {
    return <>
      placeholder
    </>
  }

  return <>
    <input value={value} type='text' onChange={(evt) => setValue(evt.target.value)}></input>
    <Button color="blue" appearance="primary" onClick={() => joinGame()}>Join</Button>
    <Button color="blue" appearance="primary" onClick={() => playGame()}>Play</Button>
    {
      canClaimAllNFT && <Button color="blue" appearance="primary" onClick={() => claimAllNFT()}>Claim All NFT</Button>
    }
    {
      canClaimETH && <Button color="blue" appearance="primary" onClick={() => claimETH()}>Claim ETH</Button>
    }
    {
      canAppendNFT && <Button color="blue" appearance="primary" onClick={() => setShowSelect(true)}>Append NFT</Button>
    }
    {
      game && <>
        <div className='game-info'>
          <div className='game-stats'>
            <div className='info-key'>
            Gamemaster:
            </div>
            <div className='info-val'>
              {game.record?.creator}
            </div>
            <div className='info-key'>
            Gamemaster Winning Percentage:
            </div>
            <div className='info-val'>
              {config?.initiatorWinProbability / 100}%
            </div>
            <div className='info-key'>
            Game join start at:
            </div>
            <div className='info-val'>
              {new Date(config?.fundraisingStartTime).toLocaleString()}
            </div>
            <div className='info-key'>
            Game join deadline:
            </div>
            <div className='info-val'>
              {new Date(config?.deadline).toLocaleString()}
            </div>
            <div className='info-key'>
            Fundraising Amount:
            </div>
            <div className='info-val'>
              {ethers.utils.formatEther(game?.fundraisingAmount.toString())}ETH
            </div>
            <div className='info-key'>
            Counterparty Count:
            </div>
            <div className='info-val'>
              {game.counterpartyCount.toString()}
            </div>
            <div className='info-key'>
            Game Status:
            </div>
            <div className='info-val'>
              {game.record?.winner === '0x0000000000000000000000000000000000000000' ? 'Wait' : 'Ended'}
            </div>
            {
              game.record?.winner !== '0x0000000000000000000000000000000000000000' && <>
                <div className='info-key'>
                Winner:
                </div>
                <div className='info-val'>
                  {game.record?.winner}
                </div>
              </>
            }
          </div>
        </div>
      </>
    }
    {
      selected.length && <div className='nft-container'>
        {
          selected.map(item => <div key={item.id} className='nft-wrap'>
            <img className='nft-img' src={item.image_url} />
            <p className='nft-name'>{item.collection.name}：{item.name}</p>
            <p>Status：{item.tombstone ? 'Claimed' : 'Unclaim'}</p>
          </div>)
        }
      </div>
    }
    <SelectNFTModal id={id} account={account} display={showSelect} onClose={() => setShowSelect(false)}></SelectNFTModal>
  </>
}
