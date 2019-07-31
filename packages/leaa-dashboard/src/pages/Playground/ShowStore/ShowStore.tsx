import React, { useRef } from 'react';
import { DatePicker, Button } from 'antd';
import { RouteComponentProps, Link } from 'react-router-dom';
import { useStore } from '@leaa/dashboard/stores';
import { authUtil } from '@leaa/dashboard/utils';
import { AttachmentBox } from '@leaa/dashboard/components/AttachmentBox';
import { IAttachmentBoxRef } from '@leaa/common/interfaces';

export default (props: RouteComponentProps) => {
  const store = useStore();
  const attachmentBoxRef = useRef<IAttachmentBoxRef>(null);

  store.mapping.abcMapping = ['aaaaaaa'];

  const onSubmitAttachmentBox = () => {
    if (attachmentBoxRef && attachmentBoxRef.current) {
      attachmentBoxRef.current.onUpdateAttachments();
    }
  };

  return (
    <div>
      <h2>BOX</h2>

      <AttachmentBox
        ref={attachmentBoxRef}
        attachmentParams={{
          type: 'image',
          moduleId: 9,
          moduleName: 'playground',
          moduleType: 'testbox',
        }}
      />

      <br />

      <Button type="primary" size="large" onClick={onSubmitAttachmentBox}>
        Submit Attachments
      </Button>

      <br />
      <br />

      <hr />

      <DatePicker />

      <h2>STORE</h2>
      <hr />
      <div>{JSON.stringify(store)}</div>

      <h2>LS AUTH</h2>
      <hr />
      <div>{JSON.stringify(authUtil.getAuthInfo())}</div>

      <h2>PROPS</h2>
      <hr />
      <div>{JSON.stringify(props.match)}</div>
    </div>
  );
};
