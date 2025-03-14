/* eslint-disable no-useless-constructor */
import React, { Fragment, Component } from 'react';
import { NavLink } from 'react-router-dom';
import Footer from '../Footer/Footer';
import Header from '../Header/Header';
import OrdersForm from './OrdersForm';
import { TempleWallet } from '@temple-wallet/dapp';
import { getBetsByBettor, withdrawAmount } from '../../apis/stackingOrdersApis';
import {
    getCurrentCycle,
    getReferencePriceAndRanges,
} from '../../apis/homepageApis';
import swal from 'sweetalert';

const CONFIG = require('../../apis/config');

export default class Stats extends Component {
    constructor(props) {
        super(props);
        this.state = {
            activeTab: 'testnet',
            accountAddress: {
                mainnet: '',
                testnet: '',
            },
            buttonSpinnerState: {
                mainnet: false,
                testnet: false,
            },
            stakingOrders: {
                mainnet: [],
                testnet: [],
            },
            wallet: '',
            ongoingWithdraw: '',
            currentCycle: {
                mainnet: 0,
                testnet: 0,
            },
            currentXTZPrice: 0,
        };
        this.ConnectWallet = this.ConnectWallet.bind(this);
        this.handleWithdrawAmount = this.handleWithdrawAmount.bind(this);
    }

    componentDidMount() {
        this.getCurrentCycle();
    }

    async handleWithdrawAmount(cycle, network, wallet, index) {
        try {
            this.setState({ ongoingWithdraw: index });
            // eslint-disable-next-line no-unused-vars
            const withdrawAmountResponse = await withdrawAmount(
                cycle,
                network,
                wallet
            );
            if (withdrawAmountResponse.sucess) {
                swal({
                    title: 'Amount withdrawal sucessfull',
                    text:
                        'Operation id: \n' + withdrawAmountResponse.operationId,
                    icon: 'success',
                    button: 'Okay',
                });
                this.setState({ ongoingWithdraw: '' }, () =>
                    this.GetStakingData()
                );
            } else {
                swal({
                    title: 'Error while placing withdrawl request',
                    text: withdrawAmountResponse.error.message,
                    icon: 'error',
                    button: 'Okay',
                });
                this.setState({ ongoingWithdraw: '' }, () =>
                    this.GetStakingData()
                );
            }
        } catch (error) {
            this.setState({ ongoingWithdraw: '' });
        }
    }

    getCurrentCycle = async () => {
        let { currentCycle } = this.state;
        const API_RESPONSE = await Promise.all([
            getCurrentCycle('mainnet'),
            getCurrentCycle('testnet'),
        ]);
        if (API_RESPONSE[0].sucess) {
            currentCycle = {
                mainnet: API_RESPONSE[0].currentCycle,
                testnet: API_RESPONSE[1].currentCycle,
            };
            this.setState({ currentCycle });
        }
    };

    GetStakingData = () => {
        const {
            accountAddress,
            activeTab,
            buttonSpinnerState,
            stakingOrders,
            currentCycle,
        } = this.state;
        buttonSpinnerState[activeTab] = true;
        this.setState({ buttonSpinnerState }, async () => {
            const API_RESPONSE = await Promise.all([
                getBetsByBettor(accountAddress[activeTab], activeTab),
                getReferencePriceAndRanges(currentCycle[activeTab], activeTab),
            ]);
            const getBetsResponse = API_RESPONSE[0];
            buttonSpinnerState[activeTab] = false;
            if (API_RESPONSE[0].sucess && API_RESPONSE[1].sucess) {
                stakingOrders[activeTab] = getBetsResponse.bets;
                const currentXTZPrice =
                    API_RESPONSE[1].data.referencePrice / Math.pow(10, 3);
                this.setState({
                    stakingOrders,
                    buttonSpinnerState,
                    currentXTZPrice,
                });
            } else {
                stakingOrders[activeTab] = [];
                this.setState({ buttonSpinnerState, stakingOrders });
            }
        });
    };

    async ConnectWallet() {
        try {
            const { accountAddress, activeTab } = this.state;
            const available = await TempleWallet.isAvailable();
            if (!available) {
                throw new Error('Please Install');
            }
            const wallet = new TempleWallet('Stakepool');
            activeTab === 'mainnet'
                ? await wallet.connect('mainnet', { forcePermission: true })
                : await wallet.connect('edo2net', { forcePermission: true });
            const tezos = wallet.toTezos();
            tezos.setProvider(CONFIG.RPC_NODES[activeTab]);
            tezos.setRpcProvider(CONFIG.RPC_NODES[activeTab]);
            const accountPkh = await tezos.wallet.pkh();
            accountAddress[activeTab] = accountPkh;
            this.setState({ accountAddress, wallet }, () => {
                this.GetStakingData();
            });
        } catch (error) {
            console.log(error);
        }
    }

    toggleTabs = (activeTab) => {
        this.setState({ activeTab });
    };

    render() {
        const { activeTab } = this.state;
        return (
            <Fragment>
                <div className="main-page-container">
                    <div className="banner">
                        <div className="container">
                            <Header {...this.props} />
                            <div className="banner-content-container">
                                <h1 className="banner-heading">
                                    Your staking orders
                                </h1>
                                <div
                                    className="staking-orders-container shadow-lg"
                                    style={{ flexDirection: 'column' }}
                                >
                                    <div className="row main-row">
                                        <ul className="nav nav-tabs">
                                            <li className="nav-item">
                                                <NavLink
                                                    className={
                                                        activeTab === 'mainnet'
                                                            ? `nav-link mainnet-active-tab`
                                                            : 'nav-link'
                                                    }
                                                    to="#"
                                                    onClick={() =>
                                                        this.toggleTabs(
                                                            'mainnet'
                                                        )
                                                    }
                                                >
                                                    Mainnet
                                                </NavLink>
                                            </li>
                                            <li className="nav-item">
                                                <NavLink
                                                    className={
                                                        activeTab === 'testnet'
                                                            ? `nav-link testnet-active-tab`
                                                            : 'nav-link'
                                                    }
                                                    to="#"
                                                    onClick={() =>
                                                        this.toggleTabs(
                                                            'testnet'
                                                        )
                                                    }
                                                >
                                                    Testnet
                                                </NavLink>
                                            </li>
                                        </ul>
                                    </div>
                                    <div className="row order-form-container">
                                        <OrdersForm
                                            {...this.state}
                                            ConnectWallet={this.ConnectWallet}
                                            withdrawAmount={
                                                this.handleWithdrawAmount
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <Footer {...this.props} />
                </div>
            </Fragment>
        );
    }
}
