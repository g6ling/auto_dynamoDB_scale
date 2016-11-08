# dynamoDB auto scale

[https://g6ling.github.io/2016/11/08/aws-dynamodb-auto-scale/](https://g6ling.github.io/2016/11/08/aws-dynamodb-auto-scale/)에 자세한 설명이 있습니다. autoScaleDown은 dynamic-dynamodb-lambda 을 사용하였습니다.


## 사용법
0-1. IAM 을 들어가서 DynamoDB, CloudWatch, Lambda 의 권한을 가진 role을 만들어 줍니다.
0-2. SNS 을 들어가서 dynamoDB_auto_ScaleUp 이라는 토픽을 생성해 줍니다.

1. 각각의 폴더의 config.js을 적당히 수정을 해줍시다.
2. 각각 압축을 합니다.
3. lambda 2개 만들고 각각 폴더를 압축한 zip파일을 업로드 합니다.
4. handler 는 `autoDown.handler`, `autoUp.handler`로 수정합니다.
5. role은 0에서 만든 권한을 사용합니다.
6. 트리거는 ScaleUP은 0에서 만든 토픽을 이용, ScaleDown은 cloudWatch-Schedule을 사용합니다. 시간은 적당히 설정하시면 됩니다.
7. CloudWatch의 알람을 들어가서 알람이벤트가 SNS에 전해지도록 설정합니다.

잘 안되는 부분이 있거나, 헷갈리는 부분, 이해가 안되는 부분이 있다면 위의 블로그 링크를 들어가시면 자세한 설명이 있으니 참조하시길 바랍니다.
