import { ethers } from 'ethers'
import { useRouter } from 'next/router'
import { useEffect, useState, useMemo } from 'react'
import { contract } from 'connectors/contract'
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
  const [claimingNFTList, setClaimingNFTList] = useState({})
  const [loadingState, setLoadingState] = useState({
    claimAllNFT: false,
    claimETH: false,
    join: false,
    play: false,
    init: true
  })
  const [showSelect, setShowSelect] = useState(false)

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
      fundraisingAmount: parseFloat(result.fundraisingAmount.toString())
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
    try {
      if (!gameJoinable) {
        toast('现在不能加入游戏')
        return
      }
  
      if (game.record.creator === account) {
        toast('创建者不能加入游戏')
        return
      }
  
      const numVal = parseFloat(value)
  
      if (numVal <= 0) {
        toast('不能小于0')
        return
      }
  
      if (numVal < config.minCounterpartyBid) {
        toast('不能小于最小值')
        return
      }
  
      if (config.maxCounterpartyBid && config.maxCounterpartyBid < numVal) {
        toast('不能大于最大值')
        return
      }

      console.log('value', ethers.utils.parseEther(value))
      setLoadingState({
        ...loadingState,
        join: true
      })
      const newContract = contract.connect(provider.getSigner())
      const tx = await newContract.joinGambling(id, {
        value: ethers.utils.parseEther(value)
      })
  
      console.log("tx", tx);
      const receipt = await tx.wait();
      console.log("receipt", receipt);
    } catch (err) {
      console.log('joinGame', err)
    } finally {
      setLoadingState({
        ...loadingState,
        join: false
      })
    }
  }

  const playGame = async () => {
    try {
      if (!gamePlayable) {
        toast('现在不能开启游戏')
        return
      }

      setLoadingState({
        ...loadingState,
        play: true
      })
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
    } catch (err) {
      console.log('playGame', err)
    } finally {
      setLoadingState({
        ...loadingState,
        play: false
      })
    }
  }

  const claimAllNFT = async () => {
    try {
      if (gameStatus !== 'ended') {
        toast('游戏结束后才可以 claim')
        return
      }

      if (!isWinner) {
        toast('游戏胜利者才可以 claim')
        return
      }

      if (!selected.filter(_ => !_.tombstone).length) {
        toast('已经全部 claim 了')
        return
      }

      if (Object.values(claimingNFTList).filter(_ => _).length) {
        toast('正在 claim')
        return
      }

      setLoadingState({
        ...loadingState,
        claimAllNFT: true
      })

      const newContract = contract.connect(provider.getSigner())
      const tx = await newContract.claimGamblingNFTs(id)
  
      console.log("tx", tx);
  
      const receipt = await tx.wait();
      console.log("receipt", receipt);
    } catch (err) {
      console.log("claimAllNFT", err);
    } finally {
      setLoadingState({
        ...loadingState,
        claimAllNFT: false
      })
    }
  }

  const claimOneNFT = async (nft, index) => {
    try {
      if (gameStatus !== 'ended') {
        toast('游戏结束后才可以 claim')
        return
      }

      if (!isWinner) {
        toast('游戏胜利者才可以 claim')
        return
      }

      if (claimingNFTList[nft.id] || nft.tombstone) {
        return
      }

      setClaimingNFTList({
        ...claimingNFTList,
        [nft.id]: true
      })
      const newContract = contract.connect(provider.getSigner())
      const tx = await newContract.claimGamblingNFT(ethers.BigNumber.from(id), ethers.BigNumber.from(index))
      console.log("tx", tx);
      const receipt = await tx.wait();
      console.log("receipt", receipt);
    } catch (err) {
      console.log('claimOneNFT', err)
    } finally {
      setClaimingNFTList({
        ...claimingNFTList,
        [nft.id]: false
      })
    }
  }

  const claimETH = async () => {
    try {
      if (gameStatus !== 'ended') {
        toast('游戏结束后可以提币')
        return
      }

      if (loadingState.claimAllNFT) {
        toast('正在 claim')
        return
      }

      setLoadingState({
        ...loadingState,
        claimETH: true
      })
      const newContract = contract.connect(provider.getSigner())
      const tx = await newContract.claimGamblingETH(id)
  
      console.log("tx", tx);
  
      const receipt = await tx.wait();
      console.log("receipt", receipt);
    } catch (err) {
      console.log('claimETH', err)
    } finally {
      setLoadingState({
        ...loadingState,
        claimETH: false
      })
    }
  }

  const isOwner = useMemo(() => {
    return id && account && game && account === game.record.creator
  }, [id, account, game])

  const isWinner = useMemo(() => {
    return game && game.record.winner === account
  }, [game, account])

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

    const noWinner = game.record.winner === '0x0000000000000000000000000000000000000000'

    if (parseFloat(game.record.VRFRequestId.toString()) !== 0 && noWinner) {
      return 'openning'
    }

    return noWinner ? 'open' : 'ended'
  }, [game, config])

  const canAppendNFT = useMemo(() => {
    return isOwner && gameStatus && gameStatus !== 'ended' && gameStatus !== 'closed'
  }, [isOwner, gameStatus])

  const gamePlayable = useMemo(() => {
    return gameStatus === 'open' && config.fundraisingAmount > 0
  }, [gameStatus, config])

  const gameJoinable = useMemo(() => {
    return !!selected.length && gameStatus === 'open'
  }, [gameStatus, selected])

  const canClaimAllNFT = useMemo(() => {
    return game && !!selected.length
  }, [game, selected])

  const canClaimETH = useMemo(() => {
    return myBid > 0
  }, [myBid])

  useEffect(() => {
    getGame()
    getMyBid()
  }, [provider, account, id])

  useEffect(() => {
    setLoadingState({
      ...loadingState,
      init: !id || !provider || !account || !game
    })
  }, [provider, account, id, game])

  useEffect(() => {
    if (from === 'create') {
      setShowSelect(true)
    }
  }, [from])

  if (loadingState.init) {
    return <>
      placeholder
    </>
  }

  return <>
    <input value={value} type='text' onChange={(evt) => setValue(evt.target.value)}></input>
    <Button color="blue" loading={loadingState.join} appearance="primary" onClick={() => joinGame()}>Join</Button>
    <Button color="blue" loading={loadingState.play} appearance="primary" onClick={() => playGame()}>Play</Button>
    {
      canClaimAllNFT && <Button color="blue" loading={loadingState.claimAllNFT} appearance="primary" onClick={() => claimAllNFT()}>Claim All NFT</Button>
    }
    {
      canClaimETH && <Button color="blue" loading={loadingState.claimETH} appearance="primary" onClick={() => claimETH()}>Claim ETH</Button>
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
              {gameStatus}
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
          selected.map((item, index) => <div key={item.id} className='nft-wrap'>
            <img className='nft-img' src={item.image_url} />
            <p className='nft-name'>{item.collection.name}：{item.name}</p>
            <Button disabled={item.tombstone} loading={claimingNFTList[item.id]} onClick={() => claimOneNFT(item, index)}>Claim</Button>
          </div>)
        }
      </div>
    }
    <SelectNFTModal id={id} account={account} display={showSelect} onClose={() => setShowSelect(false)}></SelectNFTModal>
  </>
}
