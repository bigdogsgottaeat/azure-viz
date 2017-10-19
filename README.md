# azure-viz

Azure Viz is a simple Video Indexer example that store the videos within Azure Blob

To allow for larger upload sizes than 10M change the web.conf within the 'site' directory

This directive will allow the upload of large files:

 ::<requestLimits maxAllowedContentLength="4294967295"/>::

This is the complete XML entry:
  ::<security>
      <requestFiltering>
        <hiddenSegments>
          <remove segment="bin"/>
        </hiddenSegments>
        <requestLimits maxAllowedContentLength="4294967295"/>
      </requestFiltering>
    </security>::

