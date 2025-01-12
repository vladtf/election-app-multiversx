import { useState, useCallback } from 'react';
import {
  deleteTransactionToast,
  removeAllSignedTransactions,
  removeAllTransactionsToSign
} from '@multiversx/sdk-dapp/services/transactions/clearTransactions';
import { API_URL, contractAddress } from 'config';
import { signAndSendTransactions } from 'helpers/signAndSendTransactions';
import {
  useGetAccountInfo,
  useGetNetworkConfig,
  useTrackTransactionStatus
} from 'hooks/sdkDappHooks';
import { GAS_PRICE, SessionEnum, VERSION } from 'localConstants';
import { getChainId } from 'utils/getChainId';
import { smartContract } from 'utils/smartContract';
import {
  PingRawProps,
  PingPongServiceProps,
  PongRawProps
} from 'types/pingPong.types';
import { newTransaction } from 'helpers/sdkDappHelpers';
import { Address, ProxyNetworkProvider } from 'utils/sdkDappCore';
import { AddressValue, BigIntValue, BigUIntValue, ResultsParser, StringValue, TypedValue } from '@multiversx/sdk-core/out';

type PingPongTransactionProps = {
  type: SessionEnum;
};

const PING_TRANSACTION_INFO = {
  processingMessage: 'Processing Ping transaction',
  errorMessage: 'An error has occured during Ping',
  successMessage: 'Ping transaction successful'
};

const PONG_TRANSACTION_INFO = {
  processingMessage: 'Processing Pong transaction',
  errorMessage: 'An error has occured during Pong',
  successMessage: 'Pong transaction successful'
};

const REGISTER_ELECTION_INFO = {
  processingMessage: 'Processing Register Election transaction',
  errorMessage: 'An error has occured during Register Election',
  successMessage: 'Register Election transaction successful'
};

export const useSendPingPongTransaction = ({
  type
}: PingPongTransactionProps) => {
  // Needed in order to differentiate widgets between each other
  // By default sdk-dapp takes the last sessionId available which will display on every widget the same transaction
  // this usually appears on page refreshes
  const [pingPongSessionId, setPingPongSessionId] = useState(
    sessionStorage.getItem(type)
  );

  const { network } = useGetNetworkConfig();
  const { address, account } = useGetAccountInfo();

  const transactionStatus = useTrackTransactionStatus({
    transactionId: pingPongSessionId ?? '0'
  });

  const clearAllTransactions = () => {
    removeAllSignedTransactions();
    removeAllTransactionsToSign();
    deleteTransactionToast(pingPongSessionId ?? '');
  };

  const getDisputeIDList = useCallback(
    async ({ electionId }: any) => {
      const disputeIdList = await smartContract.methodsExplicit
        .getDisputeIDList(electionId)
        .buildQuery();

      const proxyNetworkProvider = new ProxyNetworkProvider(API_URL);
      let queryResponse = await proxyNetworkProvider.queryContract(disputeIdList);
      let disputeIdListRes = new ResultsParser().parseQueryResponse(queryResponse, smartContract.getEndpoint('getDisputeIDList'));

      const mappedDisputeIdList = disputeIdListRes.values.map((value: any) => value.items[0].value.toString());
      return mappedDisputeIdList;
    }, []
  );

  const getElectionIdList = useCallback(
    async () => {
      const electionIdList = await smartContract.methodsExplicit
        .getElectionIDList()
        .buildQuery();

      const proxyNetworkProvider = new ProxyNetworkProvider(API_URL);
      let queryResponse = await proxyNetworkProvider.queryContract(electionIdList);
      let electionIdListRes = new ResultsParser().parseQueryResponse(queryResponse, smartContract.getEndpoint('getElectionIDList'));

      const mappedElectionIdList = electionIdListRes.values.map((value: any) => value.items[0].value.toString());
      return mappedElectionIdList;
    }, []
  );

  const getCandidateFee = useCallback(
    async () => {
      const candidateFeeQuery = await smartContract.methodsExplicit
        .getCandidateFee()
        .buildQuery();

      const proxyNetworkProvider = new ProxyNetworkProvider(API_URL);
      let queryResponse = await proxyNetworkProvider.queryContract(candidateFeeQuery);
      let candidateFeeRes = new ResultsParser().parseQueryResponse(queryResponse, smartContract.getEndpoint('getCandidateFee'));

      let candidateFee = candidateFeeRes.firstValue?.valueOf().toString();
      console.log("Candidate Fee: ", candidateFee);

      return candidateFee;
    }, []);



  const registerElection = useCallback(
    async ({ name, description, start_time, end_time }: any) => {
      const electionDetails: TypedValue[] = [
        new StringValue(name),
        new StringValue(description),
        new BigIntValue(0),
        new BigUIntValue(start_time),
        new BigUIntValue(end_time),
      ];

      const registerElection = smartContract.methodsExplicit
        .registerElection(electionDetails)
        .withSender(new Address(address))
        .withGasLimit(60000000)
        .withChainID(getChainId())
        .buildTransaction();

      const sessionId = await signAndSendTransactions({
        transactions: [registerElection],
        callbackRoute: '/dashboard',
        transactionsDisplayInfo: REGISTER_ELECTION_INFO
      });

      sessionStorage.setItem(type, sessionId);
      setPingPongSessionId(sessionId);
    }, []
  );

  return {
    sendPingTransaction,
    sendPingTransactionFromAbi,
    sendPongTransaction,
    sendPongTransactionFromAbi,
    sendPingTransactionFromService,
    sendPongTransactionFromService,
    getElectionIdList,
    getCandidateFee,
    getDisputeIDList,
    registerElection,
    transactionStatus
  };
};
