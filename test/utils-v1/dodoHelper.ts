import { BigNumber } from 'bignumber.js';

export const RStatusOne = 0;
export const RStatusAboveOne = 1;
export const RStatusBelowOne = 2;

export class DODOHelper {
  // unstable
  public B!: BigNumber; // DODO._BASE_BALANCE_() / 10^baseDecimals
  public Q!: BigNumber; // DODO._QUOTE_BALANCE_() / 10^quoteDecimals
  public B0!: BigNumber; // DODO._TARGET_BASE_TOKEN_AMOUNT_() / 10^baseDecimals
  public Q0!: BigNumber; // DODO._TARGET_QUOTE_TOKEN_AMOUNT_() / 10^quoteDecimals
  public RStatus!: number; // DODO._R_STATUS_()
  public OraclePrice!: BigNumber; // DODO.getOraclePrice() / 10^(18-baseDecimals+quoteDecimals)

  // stable
  public k!: BigNumber; // DODO._K_()/10^18
  public mtFeeRate!: BigNumber; // DODO._MT_FEE_RATE_()/10^18
  public lpFeeRate!: BigNumber; // DODO._LP_FEE_RATE_()/10^18

  constructor(pairDetail:any) {
    this.B = pairDetail.B
    this.Q = pairDetail.Q
    this.B0 = pairDetail.B0
    this.Q0 = pairDetail.Q0
    this.RStatus = pairDetail.RStatus
    this.OraclePrice = pairDetail.OraclePrice
    this.k = pairDetail.k
    this.mtFeeRate = pairDetail.mtFeeRate
    this.lpFeeRate = pairDetail.lpFeeRate
  }

  // return mid price
  public getMidPrice(): BigNumber {
    if (this.RStatus === RStatusOne) {
      return this.OraclePrice;
    }
    if (this.RStatus === RStatusAboveOne) {
      let R = this.B0.div(this.B);
      R = R.multipliedBy(R)
        .multipliedBy(this.k)
        .minus(this.k)
        .plus(new BigNumber(1));
      return this.OraclePrice.multipliedBy(R);
    }
    if (this.RStatus === RStatusBelowOne) {
      let R = this.Q0.div(this.Q);
      R = R.multipliedBy(R)
        .multipliedBy(this.k)
        .minus(this.k)
        .plus(new BigNumber(1));
      return this.OraclePrice.div(R);
    }
    return this.OraclePrice;
  }

  // return the targetBase and targetQuote assuming system balanced
  public getExpectedTarget(): { base: BigNumber; quote: BigNumber } {
    let baseTarget: BigNumber;
    let quoteTarget: BigNumber;
    baseTarget = this.B0;
    quoteTarget = this.Q0;
    if (this.RStatus === RStatusOne) {
      baseTarget = this.B0;
      quoteTarget = this.Q0;
    }
    if (this.RStatus === RStatusAboveOne) {
      quoteTarget = this.Q0;
      baseTarget = solveQuadraticFunctionForTarget(this.B, this.k, this.Q.minus(this.Q0).div(this.OraclePrice));
    }
    if (this.RStatus === RStatusBelowOne) {
      baseTarget = this.B0;
      quoteTarget = solveQuadraticFunctionForTarget(
        this.Q,
        this.k,
        this.B.minus(this.B0).multipliedBy(this.OraclePrice)
      );
    }
    return {
      base: baseTarget,
      quote: quoteTarget
    };
  }

  // return paid quote amount (fee deducted)
  public queryBuyBase(amount: BigNumber) {
    let mtFee = amount.multipliedBy(this.mtFeeRate);
    let lpFee = amount.multipliedBy(this.lpFeeRate);
    amount = amount.plus(mtFee).plus(lpFee);
    let target = this.getExpectedTarget();
    let quote = new BigNumber(0);
    if (this.RStatus === RStatusOne) {
      quote = this.ROneBuyBase(amount, target.base);
    } else if (this.RStatus === RStatusAboveOne) {
      quote = this.RAboveBuyBase(amount, target.base);
    } else {
      let backOneBase = this.B.minus(target.base);
      let backOneQuote = target.quote.minus(this.Q);
      if (amount.isLessThanOrEqualTo(backOneBase)) {
        quote = this.RBelowBuyBase(amount, target.quote);
      } else {
        quote = backOneQuote.plus(this.ROneBuyBase(amount.minus(backOneBase), target.base));
      }
    }

    return quote
  }

  // return received quote amount (fee deducted)
  public querySellBase(amount: BigNumber) {
    let result: BigNumber;
    let target = this.getExpectedTarget();
    if (this.RStatus === RStatusOne) {
      result = this.ROneSellBase(amount, target.quote);
    } else if (this.RStatus === RStatusBelowOne) {
      result = this.RBelowSellBase(amount, target.quote);
    } else {
      let backOneBase = target.base.minus(this.B);
      let backOneQuote = this.Q.minus(target.quote);
      if (amount.isLessThanOrEqualTo(backOneBase)) {
        result = this.RAboveSellBase(amount, target.base);
      } else {
        result = backOneQuote.plus(this.ROneSellBase(amount.minus(backOneBase), target.quote));
      }
    }
    let mtFee = result.multipliedBy(this.mtFeeRate);
    let lpFee = result.multipliedBy(this.lpFeeRate);

    const quote = result.minus(mtFee).minus(lpFee);

    return quote
  }

  // return paid base amount (fee deducted)
  public queryBuyQuote(amount: BigNumber): BigNumber {
    let mtFee = amount.multipliedBy(this.mtFeeRate);
    let lpFee = amount.multipliedBy(this.lpFeeRate);
    amount = amount.plus(mtFee).plus(lpFee);
    let target = this.getExpectedTarget();
    if (this.RStatus === RStatusOne) {
      return this.ROneBuyQuote(amount, target.quote);
    } else if (this.RStatus === RStatusBelowOne) {
      return this.RBelowBuyQuote(amount, target.quote);
    } else {
      let backOneBase = target.base.minus(this.B);
      let backOneQuote = this.Q.minus(target.quote);
      if (amount.isLessThanOrEqualTo(backOneQuote)) {
        return this.RAboveBuyQuote(amount, target.base);
      } else {
        return backOneBase.plus(this.ROneBuyQuote(amount.minus(backOneQuote), target.quote));
      }
    }
  }

  // return received base amount (fee deducted)
  public querySellQuote(amount: BigNumber): BigNumber {
    let result: BigNumber;
    let target = this.getExpectedTarget();
    if (this.RStatus === RStatusOne) {
      result = this.ROneSellQuote(amount, target.base);
    } else if (this.RStatus === RStatusAboveOne) {
      result = this.RAboveSellQuote(amount, target.base);
    } else {
      let backOneBase = this.B.minus(target.base);
      let backOneQuote = target.quote.minus(this.Q);
      if (amount.isLessThanOrEqualTo(backOneQuote)) {
        result = this.RBelowSellQuote(amount, target.quote);
      } else {
        result = backOneBase.plus(this.ROneSellQuote(amount.minus(backOneQuote), target.base));
      }
    }
    let mtFee = result.multipliedBy(this.mtFeeRate);
    let lpFee = result.multipliedBy(this.lpFeeRate);
    return result.minus(mtFee).minus(lpFee);
  }

  public getWithdrawBasePenalty(amount: BigNumber): BigNumber {
    if (this.RStatus === RStatusAboveOne) {
      let baseTarget = solveQuadraticFunctionForTarget(this.B, this.k, this.Q.minus(this.Q0).div(this.OraclePrice));
      let baseTargetWithdraw = solveQuadraticFunctionForTarget(
        this.B.minus(amount),
        this.k,
        this.Q.minus(this.Q0).div(this.OraclePrice)
      );
      let penalty = baseTarget.minus(baseTargetWithdraw).minus(amount);
      return penalty;
    } else {
      return new BigNumber(0);
    }
  }

  public getWithdrawQuotePenalty(amount: BigNumber): BigNumber {
    if (this.RStatus === RStatusBelowOne) {
      let quoteTarget = solveQuadraticFunctionForTarget(
        this.Q,
        this.k,
        this.B.minus(this.B0).multipliedBy(this.OraclePrice)
      );
      let quoteTargetWithdraw = solveQuadraticFunctionForTarget(
        this.Q.minus(amount),
        this.k,
        this.B.minus(this.B0).multipliedBy(this.OraclePrice)
      );
      let penalty = quoteTarget.minus(quoteTargetWithdraw).minus(amount);
      return penalty;
    } else {
      return new BigNumber(0);
    }
  }

  // =========== helper ROne ===========

  public ROneBuyBase(amount: BigNumber, targetBase: BigNumber): BigNumber {
    if (amount.isGreaterThanOrEqualTo(targetBase)) {
      throw new Error('ROne Buy Base Amount Exceed Limitation');
    }
    return integrate(targetBase, targetBase, targetBase.minus(amount), this.OraclePrice, this.k);
  }

  public ROneBuyQuote(amount: BigNumber, targetQuote: BigNumber): BigNumber {
    if (amount.isGreaterThanOrEqualTo(targetQuote)) {
      throw new Error('ROne Buy Quote Amount Exceed Limitation');
    }
    return integrate(
      targetQuote,
      targetQuote,
      targetQuote.minus(amount),
      new BigNumber(1).div(this.OraclePrice),
      this.k
    );
  }

  public ROneSellBase(amount: BigNumber, targetQuote: BigNumber): BigNumber {
    let newQ = solveQuadraticFunctionForTrade(targetQuote, targetQuote, this.OraclePrice, amount.negated(), this.k);
    return targetQuote.minus(newQ);
  }

  public ROneSellQuote(amount: BigNumber, targetBase: BigNumber): BigNumber {
    let newB = solveQuadraticFunctionForTrade(
      targetBase,
      targetBase,
      new BigNumber(1).div(this.OraclePrice),
      amount.negated(),
      this.k
    );
    return targetBase.minus(newB);
  }

  // =========== helper RAbove ===========

  public RAboveBuyBase(amount: BigNumber, targetBase: BigNumber): BigNumber {
    if (amount.isGreaterThanOrEqualTo(this.B)) {
      throw new Error('RAbove Buy Base Amount Exceed Limitation');
    }
    return integrate(targetBase, this.B, this.B.minus(amount), this.OraclePrice, this.k);
  }

  public RAboveSellBase(amount: BigNumber, targetBase: BigNumber): BigNumber {
    if (amount.plus(this.B).isGreaterThan(targetBase)) {
      throw new Error('RAbove Sell Base Amount Exceed Limitation');
    }
    return integrate(targetBase, this.B.plus(amount), this.B, this.OraclePrice, this.k);
  }

  public RAboveBuyQuote(amount: BigNumber, targetBase: BigNumber): BigNumber {
    let newB = solveQuadraticFunctionForTrade(
      targetBase,
      this.B,
      new BigNumber(1).div(this.OraclePrice),
      amount,
      this.k
    );
    return newB.minus(this.B);
  }

  public RAboveSellQuote(amount: BigNumber, targetBase: BigNumber): BigNumber {
    let newB = solveQuadraticFunctionForTrade(
      targetBase,
      this.B,
      new BigNumber(1).div(this.OraclePrice),
      amount.negated(),
      this.k
    );
    return this.B.minus(newB);
  }

  // =========== helper RBelow ===========

  public RBelowBuyQuote(amount: BigNumber, targetQuote: BigNumber): BigNumber {
    if (amount.isGreaterThanOrEqualTo(this.Q)) {
      throw new Error('RBelow Buy Quote Amount Exceed Limitation');
    }
    return integrate(targetQuote, this.Q, this.Q.minus(amount), new BigNumber(1).div(this.OraclePrice), this.k);
  }

  public RBelowSellQuote(amount: BigNumber, targetQuote: BigNumber): BigNumber {
    if (amount.plus(this.Q).isGreaterThan(targetQuote)) {
      throw new Error('RBelow Sell Quote Amount Exceed Limitation');
    }
    return integrate(targetQuote, this.Q.plus(amount), this.Q, new BigNumber(1).div(this.OraclePrice), this.k);
  }

  public RBelowBuyBase(amount: BigNumber, targetQuote: BigNumber): BigNumber {
    let newQ = solveQuadraticFunctionForTrade(targetQuote, this.Q, this.OraclePrice, amount, this.k);
    return newQ.minus(this.Q);
  }

  public RBelowSellBase(amount: BigNumber, targetQuote: BigNumber): BigNumber {
    let newQ = solveQuadraticFunctionForTrade(targetQuote, this.Q, this.OraclePrice, amount.negated(), this.k);
    return this.Q.minus(newQ);
  }
}

export const integrate = (V0: BigNumber, V1: BigNumber, V2: BigNumber, i: BigNumber, k: BigNumber): BigNumber => {
  let fairAmount = i.multipliedBy(V1.minus(V2));
  let penalty = V0.multipliedBy(V0)
    .div(V1)
    .div(V2)
    .multipliedBy(k);
  return fairAmount.multipliedBy(new BigNumber(1).minus(k).plus(penalty));
};

export const solveQuadraticFunctionForTrade = (
  V0: BigNumber,
  V1: BigNumber,
  i: BigNumber,
  delta: BigNumber,
  k: BigNumber
): BigNumber => {
  // -b = (1-k)V1-kV0^2/V1+i*delta
  let minusB = new BigNumber(1).minus(k).multipliedBy(V1);
  minusB = minusB.minus(
    k
      .multipliedBy(V0)
      .multipliedBy(V0)
      .div(V1)
  );
  minusB = minusB.plus(i.multipliedBy(delta));

  // sqrt(b*b+4(1-k)kQ0*Q0)
  let squareRoot = new BigNumber(4)
    .multipliedBy(new BigNumber(1).minus(k))
    .multipliedBy(k)
    .multipliedBy(V0)
    .multipliedBy(V0);
  squareRoot = minusB
    .multipliedBy(minusB)
    .plus(squareRoot)
    .sqrt();

  // 2(1-k)
  let denominator = new BigNumber(2).multipliedBy(new BigNumber(1).minus(k));

  return minusB.plus(squareRoot).div(denominator);
};

export const solveQuadraticFunctionForTarget = (V1: BigNumber, k: BigNumber, fairAmount: BigNumber): BigNumber => {
  // V0 = V1+V1*(sqrt-1)/2k
  let sqrt = new BigNumber(4)
    .multipliedBy(k)
    .multipliedBy(fairAmount)
    .div(V1);
  sqrt = new BigNumber(1).plus(sqrt).sqrt();
  let premium = sqrt.minus(new BigNumber(1)).div(k.multipliedBy(new BigNumber(2)));
  return V1.multipliedBy(new BigNumber(1).plus(premium));
};
