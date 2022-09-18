import { ethers } from 'ethers'
import contractABI from '../NFTGambling.json'

export const CONTRACT_ADDRESS = '0xF5D226a29b216019894B16Ed5A0F1227bD98E1F5'

export const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  contractABI
)
