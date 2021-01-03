import * as functions from 'firebase-functions';
import { SecretManagerServiceClient, protos } from '@google-cloud/secret-manager';
import { unNull } from '../utils/null_safety_utils';
import { UserCredentials } from '../models/credentials/user_credentials';
import { AsanaCredentials } from '../models/credentials/asana_credentials';
import { GoogleCredentials } from '../models/credentials/google_credentials';

type Secret = protos.google.cloud.secretmanager.v1.ISecret;

export interface SecretManagerInterface {
  saveGoogleCredentials(secretName: string, credentials: GoogleCredentials) : void;
  saveAsanaCredentials(secretName: string, credentials: AsanaCredentials) : void;
  retrieveUserCredentials(secretName: string) : Promise<UserCredentials>;
}

// A singleton class that wraps a SecretManagerServiceClient. 
// 
// Allows saving credentials (Asana and Google) and retrieving 
export class SecretManager implements SecretManagerInterface {
  readonly projectName = 'the-process-tool';
  readonly projectNumber = '256145062869';

  // Private member and constructor.
  private client : SecretManagerServiceClient;
  private constructor(client?: SecretManagerServiceClient) {
    this.client = client ?? new SecretManagerServiceClient();
  }

  // The static instance and its singleton getter function.
  private static privateInstance: SecretManager;
  static getInstance(client?: SecretManagerServiceClient) : SecretManager {
    if (!SecretManager.privateInstance) {
      SecretManager.privateInstance = new SecretManager(client);
    }
    return SecretManager.privateInstance;
  }

  async listSecrets() : Promise<Secret[]> {
    const [secrets] = await this.client.listSecrets({parent: 'projects/'+this.projectName});
    return secrets;
  }
  
  // Retrieve the user's secret (or create one if none exists).
  async retrieveOrCreateSecret(secretName: string) : Promise<Secret> {
    let secret: Secret;
    
    try {
      [secret] = await this.client.getSecret({
        name: 'projects/'+this.projectName+'/secrets/'+secretName,
      });

      functions.logger.info('Retrieved secret: ', secret);
    }
    catch {
      functions.logger.info(`Could not retrieve a secret for: ${secretName}`);
      
      [secret] = await this.client.createSecret({
        parent: 'projects/'+this.projectName,
        secretId: secretName,
        secret: {
          name: secretName,
          // Automatic replication is documented as "the right choice in most cases".
          replication: { automatic: {} },
        },
      });

      functions.logger.info('Created secret: ', secret);
    }

    return secret;
  }

  async deleteSecret(secretName: string) : Promise<void> {
    await this.client.deleteSecret({name: 'projects/'+this.projectName+'/secrets/'+secretName});
    return;
  }

  // Retrieve the user credentials, update with the asana credentials and save a new secret version.
  async saveAsanaCredentials(secretName: string, asanaCredentials: AsanaCredentials) : Promise<void> {

    const userCredentials = await this.retrieveUserCredentials(secretName);

    // Update the credentials with the new data.
    userCredentials.asana = asanaCredentials;

    // Add a version with a payload onto the secret.
    const [version] = await this.client.addSecretVersion({
      parent: 'projects/'+this.projectName+'/secrets/'+secretName,
      payload: {
        data: Buffer.from(JSON.stringify(userCredentials), 'utf8'),
      },
    });

    functions.logger.info(`Addeded secret version ${version.name}`);
  }

  // Retrieve the user credentials, update with the google credentials and save a new secret version.
  async saveGoogleCredentials(secretName: string, googleCredentials: GoogleCredentials) : Promise<void> {

    const userCredentials = await this.retrieveUserCredentials(secretName);

    // Update the credentials with the new data.
    userCredentials.google = googleCredentials;

    // Add a version with a payload onto the secret.
    const [version] = await this.client.addSecretVersion({
      parent: 'projects/'+this.projectName+'/secrets/'+secretName,
      payload: {
        data: Buffer.from(JSON.stringify(userCredentials), 'utf8'),
      },
    });

    functions.logger.info(`Addeded secret version ${version.name}`);
  }
  
  async retrieveUserCredentials(secretName: string) : Promise<UserCredentials> {

    const [versions] = await this.client.listSecretVersions({
      parent: 'projects/'+this.projectName+'/secrets/'+secretName,
    });
    
    if(versions.length === 0) return new UserCredentials();
      
    // Access the secret.
    const [accessResponse] = await this.client.accessSecretVersion({
      name: 'projects/'+this.projectName+'/secrets/'+secretName+'/versions/latest',
    });

    const responsePayload = accessResponse.payload?.data?.toString();

    const checkedPayload = unNull(responsePayload, `When retrieving secret named ${secretName}, response payload was null`) as string;

    const payloadJson = JSON.parse(checkedPayload);

    functions.logger.log('Parsed json from responsePayload');

    const googleCredentials : GoogleCredentials = new GoogleCredentials(payloadJson.google);
    const asanaCredentials : AsanaCredentials = payloadJson.asana;
    
    return new UserCredentials(googleCredentials, asanaCredentials);
    
  }
}