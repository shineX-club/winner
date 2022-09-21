import Image from "next/image"
import Link from "next/link"

export default function Home() {
  return (
    <div className='homepage-container'>
      <img className="bg" src='/img/usage/fullpage.png'></img>
      <img className="title" src='/img/usage/index-title.svg'></img>
      <div className="desc">In winner, you can buy your favorite NFT at the lowest price and sell your NFT at the highest price at the same time, and the risk you need to take is very small</div>
      <div className="btns">
        <Link href='/spaces'>
          <a className="linear-btn">
            <Image width='24' height='24' src='/img/usage/eye.svg'></Image>
            &nbsp;
            <span>View all Trading</span>
          </a>
        </Link>
        <Link href='/create'>
          <a className="linear-btn">
            <Image width='24' height='24' src='/img/usage/plus.svg'></Image>
            &nbsp;
            <span>Create Trading</span>
          </a>
        </Link>
      </div>
      <img className="how-work" src='/img/usage/how_to_work.svg'></img>
      <div className="faq-wrap">
        <div className="faq-box">
          <div>
            <div className="faq-title">Leveraged trading</div>
            <div className="faq-desc">
              当你有一个市场价为 7 ETH 的 NFT 时，你可以在 winner 以 5 ETH 的地板价去出售它，同时设置一个最高价（如 10 ETH）以及以最高价成交的概率（如 40%）
              <br></br>
              <br></br>
              那么你有 40% 概率得到 10 ETH，60%概率得到 5 ETH
              <br></br>
              <br></br>
              对于买家来说（假设每个人出资都是 5 ETH），他有 50% 的概率得到这个 NFT，30% 的概率得不到 NFT 且无损失，20% 的概率得不到 NFT 且损失本金（5 ETH）
            </div>
          </div>
          <button className="linear-btn">
            <Image width='24' height='24' src='/img/usage/eye.svg'></Image>
            &nbsp;
            <span>Read More</span>
          </button>
        </div>
        <div className="faq-box">
          <div>
            <div className="faq-title">share-to-earn</div>
            <div className="faq-desc">
              当买家每次支付定金时，会有 0.3% 的定金作为手续费交给项目方，如果买家所访问的页面是由你分享给他的，那么这 0.3% 的手续费中就有 0.1% 归分享者（项目方获得 0.2%，分享者获得 0.1%）
              <br></br>
              <br></br>
              以上逻辑完全去中心化实现
            </div>
          </div>
          <button className="linear-btn">
            <Image width='24' height='24' src='/img/usage/eye.svg'></Image>
            &nbsp;
            <span>Read More</span>
          </button>
        </div>
      </div>
    </div>
  )
}
