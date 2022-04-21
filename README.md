# Continuous Deployment of Helm Charts on Amazon EKS using FluxCD V2 and AWS CodeCommit
This project illustrates continuous deployment of Helm chart for a sample NodeJs application on an EKS Cluster using FluxCD V2. 
FluxCD uses GitOps principles to keep the EKS cluster resources in sync with the application’s Helm chart.
Updates published to the application’s Helm chart are continuously synced by FluxCD to the EKS cluster.

# Architecture
![Arch](docs/flux.png)

# Folder structure
```
.
├── README.md                           <-- This documentation file
├── eks-cluster-cdk                     <-- CDK for deploying a EKS cluster
├── nodejs-webservice                   <-- Sample nodejs webserver packaged as a container
├── node-redis-example-app              <-- Sample K8S app packaged as Helm chart with nodejs webserver and redis backend
├── config                              <-- configuration params
└── docs                                <-- architecture diagram 
```

# Pre-reqs
* Install kubectl, iam_authenticator, eksctl
* HTTPS Git credentials for CodeCommit
* Install helm v3
* GitHub account
* DockerHub account

# Product Versions
* Helm V3
* FluxCLI V2
* kubectl V1.21
* EKS V1.21
* NodeJS V1.17
* Docker V1.21

# 1. Create EKS cluster; Create CodeCommit repository for FluxCD config
  ```shell
  # Use region us-west-2
  aws configure --profile default
      
  # Install kubectl, eksctl, iam_authenticator   
  # Create EKS cluster using either EKSCTL or CDK
  # eksctl 
  eksctl create cluster --name fluxcluster1 --version=1.21 --nodegroup-name=standard-workers --node-type=t3.medium --nodes=1 --nodes-min=1 --nodes-max=2  --node-ami=auto --managed=false --region=us-west-2
  # CDK
  cd eks-cluster-cdk
  npm i
  cdk deploy
      
  # Create a CodeCommit repository to store the FluxCD configuration for the EKS cluster
  aws codecommit create-repository --repository-name fluxcluster1-flux-config-repo --profile default
  # This will create a codecommit repository at    
  # https://git-codecommit.us-west-2.amazonaws.com/v1/repos/fluxcluster1-flux-config-repo
  
  # From the AWS Console for CodeCommit, create and download HTTP Git credentials for the codecommit repository 
  ```

# 2. Install FluxCD CLI on your local workstation; Using the FluxCD CLI, deploy FluxCD controllers on EKS cluster
* #### 2.1 Install Flux CLI
    ```shell script
    brew install fluxcd/tap/flux
    ```
  
* #### 2.2 Check pre-requisites on EKS cluster
    ```shell script
    flux check --pre
    ```

* #### 2.3 Configure FluxCD on EKS - bootstrap
    ```shell script
    # This step is called bootstrapping the EKS cluster with FluxCD configuration. 
    # This step will first write the FluxCD config files to the CodeCommit repo. 
    # Then the FluxCD configuration is installed on the EKS cluster in the namespace flux-system. 
  
    # Replace username, password values below with the HTTP Git credentials for codecommit repository
    flux bootstrap git \
      --url=https://git-codecommit.us-west-2.amazonaws.com/v1/repos/fluxcluster1-flux-config-repo \
      --username=user-37732 \
      --password=VZ8w/mhWf2= \
      --token-auth=true \
      --path=clusters/fluxcluster1
    ```


* #### 2.4 Verify FluxCD pods are running
    ```
    kubectl get pods --namespace flux-system
    ```

# 3. Create Helm Chart repository

* #### 3.1 Create a github repo named app-helm-charts
    ```shell script
    git clone https://github.com/$GITHUB_USER/app-helm-charts.git
    cd app-helm-charts
    ```
* #### 3.2 In the github repo, create a branch named = gh-pages
    ```shell script
    git checkout -b gh-pages
    # Github automatically exposes contents of the "gh-pages" branch as a Helm Chart repository available at https://$GITHUB_USER.github.io/app-helm-charts
    
    touch index.yaml
    git add index.yaml
    git commit -a -m "add index.yaml"
    git push -u origin gh-pages
    ```

# 4. Create and upload Helm chart to the Helm chart repository

* #### 4.1 Build and push image to dockerhub
    ```shell script
    cd nodejs-webservice
    npm i
    docker build -t ${username}/testnodeapp:v1 .
  
    # Login to DockerHub account 
    docker login
  
    # Push app image to dockerhub
    docker push ${username}/testnodeapp:v1
    ```

* #### 4.2 Create Helm chart for the application
    ```shell script
    # Create Helm Chart; this command will create a skeleton folder structure for the helm chart
    # In the templates sub-folder, add k8s workload specs, update Chart.yaml
    helm create node-redis-example-app
    
    # Package the helm chart; this command will create .tgz file containing a deployable helm chart
    helm package node-redis-example-app
    mv ./node-redis-example-app-1.0.0.tgz ./app-helm-charts/
    ```

* #### 4.3 Upload Helm chart to Helm Repository
    ```shell script
      
    # Generate index.yaml; helm will update the local index.yaml file by scanning the folder for updates 
    helm repo index app-helm-charts/ --url https://$GITHUB_USER.github.io/app-helm-charts
  
    # Push index.yaml, packaged chart to the Helm repository
    git commit -a -m "change index"
    git push origin
  
    # Verify the new index.yaml is being served from helm repo
    curl https://$GITHUB_USER.github.io/app-helm-charts/index.yaml
    ```

# 5. Configure FluxCD for continuous deployment of your Helm chart

* #### 5.1 Clone the CodeCommit repository to your local
    ```shell script
    git clone https://git-codecommit.us-west-2.amazonaws.com/v1/repos/fluxcluster1-flux-config-repo
    cd fluxcluster1-flux-config-repo
    ```

* #### 5.2 Create K8S namespace into which the test application will be deployed
    ```shell script
    kubectl create namespace testns
    ```

* #### 5.3 Create HelmRepository resource which contains the url for Helm repo
    ```shell script
    mkdir ./clusters/fluxcluster1/app2
  
    flux create source helm testapp-helm-charts \
      --url=https://$GITHUB_USER.github.io/testapp-helm-charts \
      --interval=1m \
      --export > ./clusters/fluxcluster1/app2/nodewebservice-helm-repo.yaml
    ```

* #### 5.4 Create HelmRelease which contains the details about the Helm Chart to release, and the target namespace
    ```shell script
    flux create hr helm-podinfo \
      --interval=2m \
      --source=HelmRepository/testapp-helm-charts \
      --chart=testapp-helm-app \
      --chart-version>=1.0.0 \
      --target-namespace=testns \
      --export > ./clusters/fluxcluster1/app2/nodewebservice-helm-chart.yaml
    ```

* #### 5.5 Commit and push flux config
    ```shell script
    git commit -m "adding helmrelease crd for my app"
    git push
  
    # Watch for application pods deployment 
    kubectl get pods --namespace testns
    ```

* #### 5.6 Verify V1 version of the application is deployed
    ```shell script
    # port forward to 3000 on nodejs webservice 
    kubectl port-forward $APP_POD_NAME -n testns 8081:3000
    curl http://localhost:8081/hello
    ```

# 6. Push a new revision of your Helm chart and verify continuous deployment

* #### 6.1 Update the app to change the hello message, build and push to docker
    ```shell script
    # Changed the hello message of the app; build a new image
    docker build -t ${username}/testnodeapp:v2
    docker push 
    ```

* #### 6.2 Change template yamls, Chart.yaml in the local chart folder
    ```shell script
  # Update application manifest to use the new image
  # Update Chart.yaml to update new version
    ```

* #### 6.3 Package and build a new chart
    ```shell script
    helm package node-redis-example-app
    mv node-redis-example-app-1.0.1.tgz ./app-helm-charts/
    ```

* #### 6.4 Push new chart to the Helm repo
    ```shell script
    # Update index.yaml 
    helm repo index app-helm-charts/ --url https://$GITHUB_USER.github.io/app-helm-charts
      
    # Commit and push index.yaml, packaged chart
    cd app-helm-charts
    git commit -a -m "change index"
    git push origin
      
    # Verify the new index.yaml is being served
    curl https://$GITHUB_USER.github.io/app-helm-charts/index.yaml
  
    # Watch for application pods deployment 
    kubectl get pods --namespace testns
    ```

* #### 6.5 Verify V2 version of the application is deployed
    ```shell script
    kubectl port-forward $APP_POD_NAME -n testns 8081:3000
    curl http://localhost:8081/hello
