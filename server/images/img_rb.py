from inference_sdk import InferenceHTTPClient

client = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key="7kDS0qoq56Si0jbdcRHV"
)

result = client.run_workflow(
    workspace_name="wisd-scixc",
    workflow_id="custom-workflow-6",
    images={
        "image": "YOUR_IMAGE.jpg"
    },
    use_cache=True # cache workflow definition for 15 minutes
)
