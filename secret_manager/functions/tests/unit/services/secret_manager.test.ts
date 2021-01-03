import { protos, SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { mock } from "jest-mock-extended";
import { SecretManager } from "../../../src/services/secret_manager";

// - retrieveSecret 
//   -> client.getSecret 
//   -> client.retrieveSecret 
describe('SecretManager.', () => {
  test('retrieveSecret() create a secret if none found.', async () => {
    
    const uid = 'uid';

    const clientMock = mock<SecretManagerServiceClient>();
    
    // When retrieveSecret() is called, the SecretManager will first call getSecret() on 
    // the client instance variable (of type SecretManagerServiceClient). 
    // If no secret exists, the client will throw so here we stub our mock so it throws
    // when getSecret is called. 
    clientMock.getSecret.mockImplementationOnce(() => { throw new Error(); });
    
    // The SecretManager should handle the exception from the client and continue on to call createSecret()
    // with secretId 
    (clientMock.createSecret as jest.Mock).mockImplementationOnce( (request: protos.google.cloud.secretmanager.v1.ICreateSecretRequest) => Promise.resolve([{secretId: request.secret?.name}])); 

    const secretManager = SecretManager.getInstance(clientMock);

    const secret = await secretManager.retrieveOrCreateSecret(uid);

    expect(secret.name).toBe(uid);

    expect(clientMock.getSecret).toHaveBeenCalled();

    expect(clientMock.createSecret).toHaveBeenCalled();
    
  });

  test('saveAsanaCredentials ...', async () => {

    // (clientMock.getSecret as jest.Mock).mockReturnValueOnce(Promise.resolve([secretMock]));

    // const clientMock = mock<SecretManagerServiceClient>();

    // clientMock.listSecretVersions.mockReturnValueOnce()

    // const secretManager = SecretManager.getInstance(clientMock);

    return true;
    
  });
});
