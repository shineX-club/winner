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
          <div className="faq-title">Leverage trading</div>
          <div className="faq-desc">
            In winner, you can buy your favorite NFT at the lowest price and sell your NFT at the highest price at the same time, and the risk you need to take is very small
          </div>
          <button className="linear-btn">
            <Image width='24' height='24' src='/img/usage/eye.svg'></Image>
            &nbsp;
            <span>Read More</span>
          </button>
        </div>
        <div className="faq-box">
          <div className="faq-title">share-to-earn</div>
          <div className="faq-desc">
            In winner, you can buy your favorite NFT at the lowest price and sell your NFT at the highest price at the same time, and the risk you need to take is very small
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
