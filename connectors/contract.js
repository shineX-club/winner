import { ethers } from 'ethers'
import contractABI from '../NFTGambling.json'

export const CONTRACT_ADDRESS = '0x58e7c6d0e80369E915ada5e90c109573A2854852'

export const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  contractABI
)
