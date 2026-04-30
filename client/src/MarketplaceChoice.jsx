import "./MarketplaceChoice.css";

export default function MarketplaceChoice({ onMarketplace, onCancel }) {
  return (
    <div className="mchoice">
      <div className="mchoice__box">
        <p className="mchoice__speaker">Goddess</p>
        <p className="mchoice__text">
          The marketplace awaits, mortal.<br />
          Would you like to trade?
        </p>
        <div className="mchoice__buttons">
          <button className="mchoice__btn mchoice__btn--confirm" onClick={onMarketplace}>
            <span className="mchoice__btn-inner">Marketplace</span>
          </button>
          <button className="mchoice__btn mchoice__btn--cancel" onClick={onCancel}>
            <span className="mchoice__btn-inner">Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
}
