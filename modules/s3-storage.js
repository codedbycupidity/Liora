/**
 * AWS S3 storage integration for training data
 * Handles upload/download of gesture training samples
 */

export class S3Storage {
    constructor() {
        this.isConfigured = false;
        this.s3Client = null;
        this.bucket = null;
        this.region = 'us-east-1';
        
        // Check if AWS credentials are available
        this.checkConfiguration();
    }

    /**
     * Check if AWS is configured from environment variables
     */
    async checkConfiguration() {
        try {
            // Check if we're in Electron environment
            if (typeof window !== 'undefined' && window.electronAPI) {
                const envVars = await window.electronAPI.getEnvVars();
                const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET, AWS_REGION } = envVars;

                if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && S3_BUCKET) {
                    this.configure(AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET, AWS_REGION || 'us-east-1');
                    return;
                }
            }
        } catch (error) {
            console.log('Could not load environment variables:', error.message);
        }
        
        console.log('S3Storage initialized (configuration needed - set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET environment variables)');
        this.isConfigured = false;
    }

    /**
     * Check if AWS SDK is available
     */
    isAWSAvailable() {
        return typeof AWS !== 'undefined';
    }

    /**
     * Configure S3 with credentials and bucket
     */
    async configure(accessKeyId, secretAccessKey, bucketName, region = 'us-east-1') {
        try {
            if (!this.isAWSAvailable()) {
                console.warn('AWS SDK not available, cannot configure S3');
                return false;
            }
            
            // Configure AWS with credentials
            AWS.config.update({
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey,
                region: region
            });
            
            // Create S3 client with explicit configuration
            this.s3Client = new AWS.S3({
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey,
                region: region,
                signatureVersion: 'v4',
                s3ForcePathStyle: false,
                apiVersion: '2006-03-01',
                endpoint: `https://s3.${region}.amazonaws.com`,
                sslEnabled: true
            });
            this.bucket = bucketName;
            this.region = region;
            this.isConfigured = true;
            
            console.log(`S3 configured for bucket: ${bucketName} in region: ${region}`);
            return true;
        } catch (error) {
            console.error('Failed to configure S3:', error);
            this.isConfigured = false;
            return false;
        }
    }

    /**
     * Upload training data to S3
     */
    async uploadTrainingData(gesture, data, isMotion = false) {
        if (!this.isConfigured || !this.s3Client) {
            console.warn('S3 not configured, skipping upload');
            return { success: false, error: 'S3 not configured' };
        }

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const type = isMotion ? 'motion' : 'static';
            const key = `training-data/${type}/${gesture}/${gesture}_${timestamp}.json`;

            const payload = {
                gesture,
                type,
                timestamp: new Date().toISOString(),
                data,
                metadata: {
                    frameCount: isMotion ? data.length : 1,
                    duration: isMotion ? this.calculateDuration(data) : null
                }
            };

            // Upload to S3 using AWS SDK v2
            const params = {
                Bucket: this.bucket,
                Key: key,
                Body: JSON.stringify(payload, null, 2),
                ContentType: 'application/json',
                Metadata: {
                    gesture: gesture,
                    type: type,
                    timestamp: payload.timestamp
                }
            };

            const response = await this.s3Client.upload(params).promise();
            console.log(`Successfully uploaded to S3: ${key}`, response);
            
            return {
                success: true,
                key: key,
                size: JSON.stringify(payload).length,
                etag: response.ETag,
                location: response.Location
            };

        } catch (error) {
            console.error('S3 upload failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Download training data from S3
     */
    async downloadTrainingData(gesture = null) {
        if (!this.isConfigured || !this.s3Client) {
            console.warn('S3 not configured, skipping download');
            return { success: false, error: 'S3 not configured' };
        }

        try {
            const prefix = gesture ? `training-data/static/${gesture}/` : 'training-data/';
            
            // List all objects with the prefix
            const listParams = {
                Bucket: this.bucket,
                Prefix: prefix,
                MaxKeys: 1000
            };

            let listResponse;
            try {
                console.log('Attempting to list S3 objects with params:', listParams);
                console.log('S3 Client config:', {
                    region: this.s3Client.config.region,
                    bucket: this.bucket,
                    hasCredentials: !!this.s3Client.config.credentials
                });
                
                listResponse = await this.s3Client.listObjectsV2(listParams).promise();
                console.log(`Successfully listed ${listResponse.Contents?.length || 0} objects from S3`);
            } catch (listError) {
                console.error('S3 ListObjectsV2 Error Details:', {
                    code: listError.code,
                    statusCode: listError.statusCode,
                    message: listError.message,
                    region: listError.region,
                    hostname: listError.hostname,
                    retryable: listError.retryable,
                    requestId: listError.requestId
                });
                
                // Check specific error types
                if (listError.statusCode === 400) {
                    console.warn('400 Bad Request - Check: 1) Bucket exists, 2) Credentials are valid, 3) Region is correct');
                } else if (listError.statusCode === 403) {
                    console.warn('403 Forbidden - Check IAM permissions for ListBucket operation');
                } else if (listError.code === 'NoSuchBucket') {
                    console.warn('Bucket does not exist or is in different region');
                }
                
                // Since listing failed, let's try a different approach
                // We'll attempt to directly fetch known files
                console.log('Attempting fallback method to fetch training data...');
                listResponse = { Contents: [] };
                
                // Try to fetch specific known gesture files as a fallback
                const knownGestures = ['OK', 'Hello', 'Good', 'Bad', 'I Love You'];
                for (const gesture of knownGestures) {
                    try {
                        const testKey = `training-data/static/${gesture}/sample_0.json`;
                        await this.s3Client.headObject({ Bucket: this.bucket, Key: testKey }).promise();
                        // If we get here, the file exists
                        listResponse.Contents.push({ Key: testKey });
                    } catch (headError) {
                        // File doesn't exist or can't access, continue
                    }
                }
            }
            
            if (!listResponse.Contents || listResponse.Contents.length === 0) {
                return {
                    success: true,
                    data: {},
                    message: 'No training data found in S3'
                };
            }

            const trainingData = {};

            // Download each file
            for (const object of listResponse.Contents) {
                try {
                    const getParams = {
                        Bucket: this.bucket,
                        Key: object.Key
                    };

                    const getResponse = await this.s3Client.getObject(getParams).promise();
                    const fileData = JSON.parse(getResponse.Body.toString());

                    // Extract gesture name from the data
                    const gestureName = fileData.gesture;
                    if (gestureName) {
                        if (!trainingData[gestureName]) {
                            trainingData[gestureName] = [];
                        }
                        
                        // Add the training sample
                        if (fileData.data && Array.isArray(fileData.data)) {
                            trainingData[gestureName].push(fileData.data);
                        }
                    }
                } catch (fileError) {
                    console.warn(`Failed to download ${object.Key}:`, fileError.message);
                }
            }

            console.log(`Downloaded training data from S3:`, Object.keys(trainingData).map(g => `${g}: ${trainingData[g].length} samples`));
            
            return {
                success: true,
                data: trainingData,
                fileCount: listResponse.Contents.length
            };

        } catch (error) {
            console.error('S3 download failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * List all training data in S3
     */
    async listTrainingData() {
        if (!this.isConfigured || !this.s3Client) {
            return { success: false, error: 'S3 not configured' };
        }

        try {
            const params = {
                Bucket: this.bucket,
                Prefix: 'training-data/',
                MaxKeys: 1000
            };

            const response = await this.s3Client.listObjectsV2(params).promise();
            
            return {
                success: true,
                files: response.Contents || [],
                count: response.KeyCount || 0
            };

        } catch (error) {
            console.error('S3 list failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get training data statistics from S3
     */
    async getTrainingStats() {
        if (!this.isConfigured) {
            return { success: false, error: 'S3 not configured' };
        }

        try {
            // Placeholder for stats calculation
            return {
                success: true,
                stats: {
                    totalFiles: 0,
                    static: {},
                    motion: {},
                    totalSize: 0
                }
            };

        } catch (error) {
            console.error('Failed to get S3 stats:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Calculate duration of motion sequence
     */
    calculateDuration(motionData) {
        if (!motionData || motionData.length < 2) return 0;
        
        const start = motionData[0].timestamp || 0;
        const end = motionData[motionData.length - 1].timestamp || 0;
        return end - start;
    }

    /**
     * Export all local training data to S3
     */
    async exportToS3(localTrainingData) {
        if (!this.isConfigured) {
            return { success: false, error: 'S3 not configured' };
        }

        const results = [];
        
        try {
            // Upload static gestures
            for (const [gesture, samples] of Object.entries(localTrainingData)) {
                for (let i = 0; i < samples.length; i++) {
                    const result = await this.uploadTrainingData(gesture, samples[i], false);
                    results.push(result);
                }
            }

            const successful = results.filter(r => r.success).length;
            const total = results.length;

            return {
                success: successful === total,
                uploaded: successful,
                total: total,
                results: results
            };

        } catch (error) {
            console.error('Export to S3 failed:', error);
            return { success: false, error: error.message };
        }
    }
}

// Export for use in other modules
export default S3Storage;