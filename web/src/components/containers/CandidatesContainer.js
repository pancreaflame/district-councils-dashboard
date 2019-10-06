import React from 'react'
import { Query } from 'react-apollo'
import { QUERY_GET_CANDIDATES } from 'queries/gql'
import { PeopleAvatar } from 'components/atoms/Avatar'
import { UnstyledNavLink } from 'components/atoms/Link'
import Rows from 'components/atoms/Rows'
import Columns from 'components/atoms/Columns'
import { Alert } from 'components/atoms/Alert'
import { Box, Typography } from '@material-ui/core'
import styled from 'styled-components'
import { getColorFromPoliticalAffiliation } from 'utils/helper'
import { COLORS } from 'ui/theme'
import PropTypes from 'prop-types'

const IMAGE_HOST_URI =
  process.env.REACT_APP_HOST_URI || 'https://hkvoteguide.github.io'

const Container = styled(Box)`
  && {
    width: 100%;
    padding: 0 0px 16px;
  }
`

const CandidateList = styled(Box)`
  && {
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: space-evenly;
    flex-wrap: wrap;
  }
`

const Candidate = styled(Box)`
  && {
    position: relative;
    width: auto;
    text-align: center;
    & > div {
      margin: 0 auto;
    }
  }
`

const CandidateNumber = styled(Box)`
  && {
    position: absolute;
    top: 64px;
    left: 3px;
    border-radius: 50%;
    font-weight: 700;
    width: ${props => props.dimension};
    height: ${props => props.dimension};
    background-color: ${props => COLORS.camp[props.camp].background};
    color: ${props => COLORS.camp[props.camp].text};
    text-align: center;
  }
`

const CandidateName = styled(Typography)`
  && {
    margin-top: 5px;
    font-weight: 700;
  }
`

const PaddingColumns = styled(Columns)`
  && {
    padding: 0 16px;
  }
`

const CandidatesContainer = props => {
  const { code, year } = props

  return (
    <Query
      query={QUERY_GET_CANDIDATES}
      variables={{ code, year }} // variables={{ code, year }}
    >
      {({ loading, error, data }) => {
        if (loading) return null
        if (error) return `Error! ${error}`
        return (
          <Container>
            <Alert>
              <Typography variant="h6" gutterBottom>
                區議會選舉提名期現已展開，至10月17日結束。
              </Typography>
            </Alert>
            {data.dcd_candidates.length > 0 && (
              <>
                <Rows>
                  <PaddingColumns>
                    <Typography variant="h6" gutterBottom>
                      已接獲提名
                    </Typography>
                  </PaddingColumns>
                </Rows>
                <Rows>
                  <PaddingColumns>
                    <CandidateList>
                      {data.dcd_candidates.map(candidate => (
                        <UnstyledNavLink
                          key={candidate.person.id}
                          to={`/profile/${candidate.person.name_zh ||
                            candidate.person.name_en}/${candidate.person.uuid}`}
                        >
                          <Candidate>
                            <PeopleAvatar
                              dimension="84px"
                              borderwidth={'4'}
                              camp={getColorFromPoliticalAffiliation(
                                candidate.person.related_organization
                              )}
                              src={`${IMAGE_HOST_URI}/static/images/avatar/${candidate.person.uuid}.jpg`}
                              imgProps={{
                                onError: e => {
                                  e.target.src =
                                    IMAGE_HOST_URI +
                                    '/static/images/avatar/default.png'
                                },
                              }}
                            />
                            {candidate.candidate_number > 0 && (
                              <CandidateNumber
                                dimension="18px"
                                camp={getColorFromPoliticalAffiliation(
                                  candidate.person.related_organization
                                )}
                              >
                                {candidate.candidate_number}
                              </CandidateNumber>
                            )}
                            <CandidateName variant="h5">
                              {candidate.person.name_zh}
                            </CandidateName>

                            <Typography variant="h6">
                              {candidate.political_affiliation}
                            </Typography>
                          </Candidate>
                        </UnstyledNavLink>
                      ))}
                    </CandidateList>
                  </PaddingColumns>
                </Rows>
              </>
            )}
          </Container>
        )
      }}
    </Query>
  )
}

CandidatesContainer.propsType = {
  // cacode: PropTypes.string,
  // year: PropTypes.number,
}
export default CandidatesContainer
